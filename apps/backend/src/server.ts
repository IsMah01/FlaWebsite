import "dotenv/config";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { cors } from "hono/cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mysql from "mysql2/promise";
import { z } from "zod";

const app = new Hono();
const databaseUrl = process.env.DATABASE_URL || "";
const uploadDir = path.resolve(process.cwd(), "storage", "private", "uploads");
const jwtSecret = process.env.JWT_SECRET || process.env.APP_SECRET;

if (!jwtSecret) {
  throw new Error("JWT_SECRET or APP_SECRET is required");
}

if (process.env.NODE_ENV === "production" && (jwtSecret.length < 32 || jwtSecret.startsWith("change_me"))) {
  throw new Error("JWT_SECRET or APP_SECRET must be a strong production secret of at least 32 characters");
}

type SessionUser = {
  id: number;
  role: "candidate" | "admin";
  email: string;
  name: string;
};

const pool = mysql.createPool(databaseUrl || "mysql://root@localhost:3306/flf_website");

app.use(
  "*",
  cors({
    origin: (origin) => origin,
    credentials: true,
  }),
);

function signSession(user: SessionUser) {
  return jwt.sign(user, jwtSecret, { expiresIn: "7d" });
}

function currentUser(token?: string): SessionUser | null {
  if (!token) return null;
  try {
    return jwt.verify(token, jwtSecret) as SessionUser;
  } catch {
    return null;
  }
}

function requireAdmin(token?: string) {
  const user = currentUser(token);
  if (!user || user.role !== "admin") return null;
  return user;
}

async function query<T = any>(sql: string, params: unknown[] = []) {
  const [rows] = await pool.query(sql, params);
  return rows as T;
}

async function migrate() {
  await query(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      firstName VARCHAR(255) NOT NULL,
      lastName VARCHAR(255) NOT NULL,
      studyStatus ENUM('student','graduated','master_student','phd_student','other') NOT NULL,
      phoneNumber VARCHAR(50) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      passwordHash VARCHAR(255) NOT NULL,
      attestationRef TEXT NULL,
      idCardRef TEXT NULL,
      isAmbassador BOOLEAN NOT NULL DEFAULT false,
      newsletterConsent BOOLEAN NOT NULL DEFAULT false,
      emailConfirmed BOOLEAN NOT NULL DEFAULT false,
      confirmationToken VARCHAR(255) NULL,
      applicationStatus ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
      adminNote TEXT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      passwordHash VARCHAR(255) NOT NULL,
      role ENUM('admin','super_admin') NOT NULL DEFAULT 'admin',
      isActive BOOLEAN NOT NULL DEFAULT true,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(320) NOT NULL,
      phone VARCHAR(50) NULL,
      subject VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      name VARCHAR(255) NULL,
      isSubscribed BOOLEAN NOT NULL DEFAULT true,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS editions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      editionNumber INT NOT NULL UNIQUE,
      title VARCHAR(255) NOT NULL,
      description TEXT NULL,
      eventDate VARCHAR(255) NULL,
      location VARCHAR(255) NULL,
      coverImage TEXT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "Admin12345!";
  const adminName = process.env.ADMIN_NAME || "Admin";
  const existingAdmins = await query<any[]>("SELECT id FROM admin_users WHERE email = ?", [adminEmail]);
  if (!existingAdmins.length) {
    await query("INSERT INTO admin_users (name, email, passwordHash) VALUES (?, ?, ?)", [
      adminName,
      adminEmail,
      await bcrypt.hash(adminPassword, 12),
    ]);
  }

  const editionCount = await query<any[]>("SELECT COUNT(*) AS count FROM editions");
  if (Number(editionCount[0]?.count || 0) === 0) {
    const rows = Array.from({ length: 16 }, (_, index) => [
      index + 1,
      `الدورة ${index + 1}`,
      "لمحة عن إحدى الدورات السابقة لمؤسسة أطر الغد وأنشطتها.",
      "سنوي",
      "المغرب",
    ]);
    for (const row of rows) {
      await query(
        "INSERT INTO editions (editionNumber, title, description, eventDate, location) VALUES (?, ?, ?, ?, ?)",
        row,
      );
    }
  }
}

const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  studyStatus: z.enum(["student", "graduated", "master_student", "phd_student", "other"]),
  phoneNumber: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  attestationRef: z.string().optional(),
  idCardRef: z.string().optional(),
  isAmbassador: z.boolean().default(false),
  newsletterConsent: z.boolean().default(false),
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/editions", async (c) => {
  const rows = await query("SELECT * FROM editions ORDER BY editionNumber DESC");
  return c.json(rows);
});

app.get("/api/editions/:id", async (c) => {
  const rows = await query<any[]>("SELECT * FROM editions WHERE id = ? OR editionNumber = ? LIMIT 1", [
    c.req.param("id"),
    c.req.param("id"),
  ]);
  if (!rows.length) return c.json({ error: "Edition not found" }, 404);
  return c.json(rows[0]);
});

app.post("/api/contact", async (c) => {
  const body = await c.req.json();
  const input = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      subject: z.string().min(1),
      message: z.string().min(1),
    })
    .parse(body);
  await query("INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)", [
    input.name,
    input.email,
    input.phone || null,
    input.subject,
    input.message,
  ]);
  return c.json({ message: "تم إرسال الرسالة بنجاح" });
});

app.post("/api/newsletter", async (c) => {
  const input = z.object({ email: z.string().email(), name: z.string().optional() }).parse(await c.req.json());
  await query(
    "INSERT INTO newsletter_subscribers (email, name, isSubscribed) VALUES (?, ?, true) ON DUPLICATE KEY UPDATE isSubscribed = true, name = VALUES(name)",
    [input.email, input.name || null],
  );
  return c.json({ message: "تم الاشتراك في النشرة" });
});

app.post("/api/upload", async (c) => {
  const input = z
    .object({
      fileName: z.string().min(1),
      mimeType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
      data: z.string().min(1),
      documentType: z.enum(["attestation", "idCard"]),
    })
    .parse(await c.req.json());

  const ext = path.extname(input.fileName).toLowerCase();
  if (![".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) {
    return c.json({ error: "نوع الملف غير مسموح" }, 400);
  }

  const buffer = Buffer.from(input.data, "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024) {
    return c.json({ error: "حجم الملف يجب أن يكون أقل من 5MB" }, 400);
  }

  const pdf = buffer.subarray(0, 4).toString("ascii") === "%PDF";
  const jpg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if ((input.mimeType === "application/pdf" && !pdf) || (input.mimeType === "image/jpeg" && !jpg) || (input.mimeType === "image/png" && !png)) {
    return c.json({ error: "محتوى الملف لا يطابق نوعه" }, 400);
  }

  await mkdir(uploadDir, { recursive: true });
  const fileName = `${input.documentType}-${randomUUID()}${ext}`;
  await writeFile(path.join(uploadDir, fileName), buffer);
  return c.json({ fileRef: `private://${fileName}` });
});

app.post("/api/candidates/register", async (c) => {
  const input = registerSchema.parse(await c.req.json());
  const token = randomUUID();
  await query(
    `INSERT INTO candidates
      (firstName, lastName, studyStatus, phoneNumber, email, passwordHash, attestationRef, idCardRef, isAmbassador, newsletterConsent, confirmationToken)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.firstName,
      input.lastName,
      input.studyStatus,
      input.phoneNumber,
      input.email,
      await bcrypt.hash(input.password, 12),
      input.attestationRef || null,
      input.idCardRef || null,
      input.isAmbassador,
      input.newsletterConsent,
      token,
    ],
  );
  if (input.newsletterConsent) {
    await query(
      "INSERT INTO newsletter_subscribers (email, name, isSubscribed) VALUES (?, ?, true) ON DUPLICATE KEY UPDATE isSubscribed = true",
      [input.email, `${input.firstName} ${input.lastName}`],
    );
  }
  return c.json({ message: "تم إنشاء الحساب. يرجى تأكيد البريد الإلكتروني.", confirmationToken: token });
});

app.post("/api/candidates/login", async (c) => {
  const input = z.object({ email: z.string().email(), password: z.string() }).parse(await c.req.json());
  const rows = await query<any[]>("SELECT * FROM candidates WHERE email = ? LIMIT 1", [input.email]);
  const candidate = rows[0];
  if (!candidate || !(await bcrypt.compare(input.password, candidate.passwordHash))) {
    return c.json({ error: "بيانات الدخول غير صحيحة" }, 401);
  }
  setCookie(c, "session", signSession({
    id: candidate.id,
    role: "candidate",
    email: candidate.email,
    name: `${candidate.firstName} ${candidate.lastName}`,
  }), { httpOnly: true, sameSite: "Lax", path: "/", maxAge: 604800 });
  return c.json({ message: "تم تسجيل الدخول" });
});

app.get("/api/candidates/confirm", async (c) => {
  const token = c.req.query("token");
  if (!token) return c.json({ error: "Token missing" }, 400);
  await query("UPDATE candidates SET emailConfirmed = true, confirmationToken = NULL WHERE confirmationToken = ?", [token]);
  return c.json({ message: "تم تأكيد البريد الإلكتروني" });
});

app.post("/api/admin/login", async (c) => {
  const input = z.object({ email: z.string().email(), password: z.string() }).parse(await c.req.json());
  const rows = await query<any[]>("SELECT * FROM admin_users WHERE email = ? AND isActive = true LIMIT 1", [input.email]);
  const admin = rows[0];
  if (!admin || !(await bcrypt.compare(input.password, admin.passwordHash))) {
    return c.json({ error: "بيانات الدخول غير صحيحة" }, 401);
  }
  setCookie(c, "session", signSession({ id: admin.id, role: "admin", email: admin.email, name: admin.name }), {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 604800,
  });
  return c.json({ message: "تم تسجيل الدخول" });
});

app.get("/api/me", (c) => c.json({ user: currentUser(getCookie(c, "session")) }));
app.post("/api/logout", (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ message: "تم تسجيل الخروج" });
});

app.use("/api/admin/*", async (c, next) => {
  if (!requireAdmin(getCookie(c, "session"))) return c.json({ error: "Forbidden" }, 403);
  await next();
});

app.get("/api/admin/stats", async (c) => {
  const [candidates, accepted, messages, editions] = await Promise.all([
    query<any[]>("SELECT COUNT(*) AS count FROM candidates"),
    query<any[]>("SELECT COUNT(*) AS count FROM candidates WHERE applicationStatus = 'accepted'"),
    query<any[]>("SELECT COUNT(*) AS count FROM contact_messages"),
    query<any[]>("SELECT COUNT(*) AS count FROM editions"),
  ]);
  return c.json({
    candidates: candidates[0].count,
    acceptedCandidates: accepted[0].count,
    messages: messages[0].count,
    editions: editions[0].count,
  });
});

app.get("/api/admin/candidates", async (c) => c.json(await query("SELECT * FROM candidates ORDER BY createdAt DESC")));
app.get("/api/admin/messages", async (c) => c.json(await query("SELECT * FROM contact_messages ORDER BY createdAt DESC")));
app.get("/api/admin/subscribers", async (c) => c.json(await query("SELECT * FROM newsletter_subscribers ORDER BY createdAt DESC")));
app.patch("/api/admin/candidates/:id/status", async (c) => {
  const input = z.object({ status: z.enum(["pending", "accepted", "rejected"]) }).parse(await c.req.json());
  await query("UPDATE candidates SET applicationStatus = ? WHERE id = ?", [input.status, c.req.param("id")]);
  return c.json({ message: "تم تحديث الحالة" });
});

app.get("/api/private-files/:fileName", async (c) => {
  if (!requireAdmin(getCookie(c, "session"))) return c.json({ error: "Forbidden" }, 403);
  const fileName = c.req.param("fileName");
  if (!/^(attestation|idCard)-[a-f0-9-]+\.(pdf|jpg|jpeg|png)$/i.test(fileName)) {
    return c.json({ error: "Invalid file name" }, 400);
  }
  const filePath = path.join(uploadDir, fileName);
  if (!filePath.startsWith(uploadDir + path.sep)) return c.json({ error: "Invalid path" }, 400);
  const data = await readFile(filePath);
  const ext = path.extname(fileName);
  return new Response(data, {
    headers: {
      "Content-Type": ext === ".pdf" ? "application/pdf" : ext === ".png" ? "image/png" : "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
});

await migrate();

const port = Number(process.env.APP_PORT || process.env.PORT || 3000);
serve({ fetch: app.fetch, port }, () => {
  console.log(`API listening on http://0.0.0.0:${port}`);
});
