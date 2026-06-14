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
import { PRIVATE_UPLOAD_DIR } from "./upload-router";
import { readFile } from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import { getDb } from "./queries/connection";
import { adminUsers } from "@db/schema";
import { eq } from "drizzle-orm";
import { ensureDatabaseSchema } from "./lib/migrate";

const app = new Hono<{ Bindings: HttpBindings }>();

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; frame-src https://www.youtube.com https://www.youtube-nocookie.com; child-src https://www.youtube.com https://www.youtube-nocookie.com; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; form-action 'self'",
};

function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

async function isInternalAdminRequest(req: Request) {
  const token = readCookie(req.headers.get("cookie"), "admin_token");
  const secret = process.env.APP_SECRET;
  if (!token || !secret) return false;

  try {
    const payload = jwt.verify(token, secret) as { type?: string; id?: number };
    if (payload.type !== "admin" || !payload.id) return false;

    const db = getDb();
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.id))
      .limit(1);

    return !!admin?.isActive;
  } catch {
    return false;
  }
}

app.use(bodyLimit({ maxSize: 15 * 1024 * 1024 }));
app.use("*", async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(securityHeaders)) {
    c.header(name, value);
  }
  if (c.req.path.startsWith("/api/")) {
    c.header("Cache-Control", "no-store");
  }
});
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

app.get("/api/private-files/:fileName", async (c) => {
  const [legacyAdmin, internalAdmin] = await Promise.all([
    authenticateRequest(c.req.raw.headers).catch(() => null),
    isInternalAdminRequest(c.req.raw),
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

  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

