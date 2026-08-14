import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./kimi/auth";
import { Paths } from "@contracts/constants";
import { authenticateRequest } from "./kimi/auth";
import { INTERVIEWER_UPLOAD_DIR, PRIVATE_UPLOAD_DIR } from "./upload-router";
import { readFile } from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import { getDb, getSqlPool } from "./queries/connection";
import { adminUsers } from "@db/schema";
import { eq } from "drizzle-orm";
import { ensureDatabaseSchema } from "./lib/migrate";
import { startCandidateQuestionnaireReminderScheduler } from "./lib/candidate-reminders";
import { startInterviewReminderScheduler } from "./lib/interview-reminders";
import crypto from "node:crypto";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleAuthorizationCode,
  isGoogleCalendarConfigured,
  saveGoogleCalendarConnection,
} from "./lib/google-calendar";

const app = new Hono<{ Bindings: HttpBindings }>();

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; child-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; form-action 'self'",
};

function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function getInternalAdminId(req: Request) {
  const token = readCookie(req.headers.get("cookie"), "admin_token");
  const secret = process.env.APP_SECRET;
  if (!token || !secret) return null;

  try {
    const payload = jwt.verify(token, secret) as { type?: string; id?: number };
    if (payload.type !== "admin" || !payload.id) return null;

    const db = getDb();
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.id))
      .limit(1);

    return admin?.isActive && admin.role !== "interview_admin" ? admin.id : null;
  } catch {
    return null;
  }
}

app.use(bodyLimit({ maxSize: 15 * 1024 * 1024 }));
app.use("*", async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(securityHeaders)) {
    c.header(name, value);
  }
  if (c.req.path === "/api/final-candidate/programme") {
    c.header("X-Frame-Options", "SAMEORIGIN");
    c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'self'");
  }
  if (c.req.path.startsWith("/api/")) {
    c.header("Cache-Control", "no-store");
  }
});

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "flf-api",
    uptimeSeconds: Math.round(process.uptime()),
  }),
);

app.get("/api/db-health", async (c) => {
  try {
    await getSqlPool().query("SELECT 1");
    return c.json({ ok: true, database: "reachable" });
  } catch {
    return c.json({ ok: false, database: "unreachable" }, 503);
  }
});

app.get(Paths.oauthCallback, createOAuthCallbackHandler());

app.get("/api/google/calendar/connect", async (c) => {
  const adminId = await getInternalAdminId(c.req.raw);
  if (!adminId) return c.json({ error: "Forbidden" }, 403);
  if (!isGoogleCalendarConfigured()) {
    return c.json({ error: "Google Calendar OAuth is not configured" }, 503);
  }
  const secret = process.env.APP_SECRET;
  if (!secret) return c.json({ error: "Server configuration error" }, 500);
  const state = jwt.sign(
    { type: "google_calendar_oauth", adminId, nonce: crypto.randomBytes(16).toString("hex") },
    secret,
    { expiresIn: "10m" },
  );
  return c.redirect(buildGoogleAuthorizationUrl(state), 302);
});

app.get("/api/google/calendar/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const oauthError = c.req.query("error");
  const secret = process.env.APP_SECRET;
  if (oauthError) return c.redirect("/admin/interviews?google=denied", 302);
  if (!code || !state || !secret) return c.redirect("/admin/interviews?google=invalid", 302);

  try {
    const payload = jwt.verify(state, secret) as {
      type?: string;
      adminId?: number;
      nonce?: string;
    };
    if (payload.type !== "google_calendar_oauth" || !payload.adminId || !payload.nonce) {
      throw new Error("Invalid OAuth state");
    }
    const db = getDb();
    const [admin] = await db
      .select({ id: adminUsers.id, isActive: adminUsers.isActive, role: adminUsers.role })
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.adminId))
      .limit(1);
    if (!admin?.isActive || admin.role === "interview_admin") throw new Error("Unauthorized admin");

    const refreshToken = await exchangeGoogleAuthorizationCode(code);
    await saveGoogleCalendarConnection(refreshToken, admin.id);
    return c.redirect("/admin/interviews?google=connected", 302);
  } catch (error) {
    console.error("[google-calendar] OAuth callback failed", error instanceof Error ? error.message : error);
    return c.redirect("/admin/interviews?google=error", 302);
  }
});

app.get("/api/private-files/:fileName", async (c) => {
  const [legacyAdmin, internalAdmin] = await Promise.all([
    authenticateRequest(c.req.raw.headers).catch(() => null),
    getInternalAdminId(c.req.raw),
  ]);

  if ((!legacyAdmin || legacyAdmin.role !== "admin") && !internalAdmin) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const fileName = c.req.param("fileName");
  if (!/^(attestation|idCard)-[a-f0-9-]+\.(pdf|jpg|jpeg|png)$/i.test(fileName)) {
    return c.json({ error: "Invalid file name" }, 400);
  }

  const filePath = path.join(PRIVATE_UPLOAD_DIR, fileName);
  if (!filePath.startsWith(PRIVATE_UPLOAD_DIR + path.sep)) {
    return c.json({ error: "Invalid file path" }, 400);
  }

  try {
    const data = await readFile(filePath);
    const ext = path.extname(fileName).toLowerCase();
    const contentType =
      ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg";
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return c.json({ error: "File not found" }, 404);
  }
});

app.get("/api/final-candidate/programme", async (c) => {
  const token = readCookie(c.req.raw.headers.get("cookie"), "candidate_token");
  const secret = process.env.APP_SECRET;
  if (!token || !secret) return c.json({ error: "Authentication required" }, 401);
  try {
    const session = jwt.verify(token, secret) as { newUserId?: number; email?: string };
    if (!session.newUserId || !session.email) return c.json({ error: "Invalid session" }, 401);
    const [rows] = await getSqlPool().query<any[]>(
      `SELECT id FROM final_candidate_confirmations
       WHERE newUserId = ? AND email = ? AND status = 'confirmed' LIMIT 1`,
      [session.newUserId, session.email.trim().toLowerCase()],
    );
    if (!rows[0]) return c.json({ error: "Forbidden" }, 403);
    const candidates = [
      path.resolve(process.cwd(), "storage", "candidate-programme", "programme-edition-18.pdf"),
      path.resolve(process.cwd(), "..", "..", "storage", "candidate-programme", "programme-edition-18.pdf"),
    ];
    let data: Buffer | null = null;
    for (const filePath of candidates) {
      try { data = await readFile(filePath); break; } catch { /* Try the next runtime layout. */ }
    }
    if (!data) return c.json({ error: "Programme not found" }, 404);
    return new Response(data, { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline; filename=programme-edition-18.pdf",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch {
    return c.json({ error: "Invalid session" }, 401);
  }
});

app.get("/api/final-candidate/profile-image/:fileName", async (c) => {
  const token = readCookie(c.req.raw.headers.get("cookie"), "candidate_token");
  const secret = process.env.APP_SECRET;
  const fileName = c.req.param("fileName");
  if (!token || !secret) return c.json({ error: "Authentication required" }, 401);
  if (!/^profile-\d+-[a-f0-9-]+\.(jpg|png)$/i.test(fileName)) return c.json({ error: "Invalid file name" }, 400);
  try {
    const session = jwt.verify(token, secret) as { newUserId?: number; email?: string };
    if (!session.newUserId || !session.email) return c.json({ error: "Invalid session" }, 401);
    const [rows] = await getSqlPool().query<any[]>(
      `SELECT id FROM final_candidate_confirmations
       WHERE newUserId = ? AND email = ? AND status = 'confirmed' AND profileImageFile = ? LIMIT 1`,
      [session.newUserId, session.email.trim().toLowerCase(), fileName],
    );
    if (!rows[0]) return c.json({ error: "Forbidden" }, 403);
    const filePath = path.resolve(process.cwd(), "storage", "private", "uploads", "final-profiles", fileName);
    const data = await readFile(filePath);
    return new Response(data, { headers: {
      "Content-Type": fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    }});
  } catch {
    return c.json({ error: "Image not found" }, 404);
  }
});

app.get("/api/admin/final-candidate-profile/:fileName", async (c) => {
  const adminId = await getInternalAdminId(c.req.raw);
  const fileName = c.req.param("fileName");
  if (!adminId) return c.json({ error: "Forbidden" }, 403);
  if (!/^profile-\d+-[a-f0-9-]+\.(jpg|png)$/i.test(fileName)) return c.json({ error: "Invalid file name" }, 400);
  try {
    const [rows] = await getSqlPool().query<any[]>(`SELECT id FROM final_candidate_confirmations WHERE profileImageFile = ? LIMIT 1`, [fileName]);
    if (!rows[0]) return c.json({ error: "Not found" }, 404);
    const data = await readFile(path.resolve(process.cwd(), "storage", "private", "uploads", "final-profiles", fileName));
    return new Response(data, { headers: { "Content-Type": fileName.endsWith(".png") ? "image/png" : "image/jpeg", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch { return c.json({ error: "Not found" }, 404); }
});

app.get("/api/interviewer-images/:fileName", async (c) => {
  const fileName = c.req.param("fileName");
  if (!/^interviewer-\d+-[a-f0-9-]+\.(jpg|jpeg|png)$/i.test(fileName)) {
    return c.json({ error: "Invalid file name" }, 400);
  }
  const filePath = path.join(INTERVIEWER_UPLOAD_DIR, fileName);
  if (!filePath.startsWith(INTERVIEWER_UPLOAD_DIR + path.sep)) {
    return c.json({ error: "Invalid file path" }, 400);
  }
  try {
    const data = await readFile(filePath);
    const contentType = path.extname(fileName).toLowerCase() === ".png" ? "image/png" : "image/jpeg";
    return new Response(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return c.json({ error: "File not found" }, 404);
  }
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  await ensureDatabaseSchema();
  startCandidateQuestionnaireReminderScheduler();
  startInterviewReminderScheduler();

  const { serve } = await import("@hono/node-server");

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

