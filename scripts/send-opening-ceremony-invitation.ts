import "dotenv/config";
import { appendFileSync, existsSync } from "node:fs";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

async function main() {
const imagePath = process.env.INVITATION_IMAGE_PATH || "storage/opening-ceremony/edition-18-invitation.jpeg";
const reportPath = process.env.INVITATION_REPORT_PATH || "storage/opening-ceremony-email-report.csv";
const shouldSend = process.argv.includes("--send");

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
if (!existsSync(imagePath)) throw new Error(`Invitation image not found: ${imagePath}`);

const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || "noreply@atralghad.org";
if (shouldSend && (!smtpHost || !smtpUser || !smtpPass)) throw new Error("SMTP configuration is incomplete");

const db = await mysql.createConnection(process.env.DATABASE_URL);
const [rows] = await db.query<mysql.RowDataPacket[]>(
  `SELECT firstName, email FROM (
     SELECT firstName, email, createdAt FROM new_users
      WHERE email IS NOT NULL AND LENGTH(TRIM(email)) > 0
     UNION ALL
     SELECT COALESCE(NULLIF(SUBSTRING_INDEX(name, ' ', 1), ''), '') AS firstName, email, createdAt FROM users
      WHERE email IS NOT NULL AND LENGTH(TRIM(email)) > 0
   ) AS all_accounts
   ORDER BY createdAt`,
);
await db.end();

const recipients = new Map<string, { firstName: string; email: string }>();
for (const row of rows) {
  const email = String(row.email).trim().toLowerCase();
  if (!recipients.has(email)) recipients.set(email, { firstName: String(row.firstName || "").trim(), email });
}

console.log(`Unique recipients: ${recipients.size}`);
if (!shouldSend) process.exit(0);

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: { user: smtpUser, pass: smtpPass },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 30_000,
});

const subject = "دعوة مفتوحة لحضور حفل افتتاح الدورة الثامنة عشرة «دورة الأثر»";
appendFileSync(reportPath, `\nstarted_at,total\n${new Date().toISOString()},${recipients.size}\nemail,status,attempts,detail\n`, "utf8");

for (const recipient of recipients.values()) {
  const safeName = recipient.firstName.replace(/[&<>"']/g, (value) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[value]!);
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"></head><body style="margin:0;background:#f2f7f6;font-family:Tahoma,Arial,sans-serif;color:#173f39"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 10px"><table role="presentation" width="640" style="width:100%;max-width:640px;background:#fff;border-radius:16px;overflow:hidden"><tr><td style="padding:28px 30px;text-align:right;line-height:2;font-size:16px"><p>السلام عليكم ورحمة الله وبركاته،</p>${safeName ? `<p>مرحباً ${safeName}،</p>` : ""}<p>يسر أكاديمية أطر الغد أن تدعوكم لحضور حفل افتتاح النسخة الثامنة عشرة من الأكاديمية «دورة الأثر».</p><p><strong>الجمعة 14 غشت 2026<br>الساعة السابعة مساءً<br>المركب الثقافي أكدال – الرباط</strong></p><p>يسعدنا حضوركم ومشاركتكم هذه اللحظة المميزة، ونعتز بأن تكونوا جزءاً من انطلاقة جديدة لمسيرة نؤمن بأن أثرها يمتد ويتجدد.</p></td></tr><tr><td align="center" style="padding:0 12px 28px"><img src="cid:opening-invitation" alt="دعوة لحضور حفل افتتاح الدورة الثامنة عشرة" style="display:block;width:100%;max-width:600px;height:auto;border:0"></td></tr><tr><td align="center" style="padding:18px;background:#173f39;color:#fff;font-size:13px">مؤسسة أطر الغد<br>Future Leaders Foundation</td></tr></table></td></tr></table></body></html>`;
  const text = `السلام عليكم ورحمة الله وبركاته،\n\nيسر أكاديمية أطر الغد أن تدعوكم لحضور حفل افتتاح النسخة الثامنة عشرة «دورة الأثر».\n\nالجمعة 14 غشت 2026\nالساعة السابعة مساءً\nالمركب الثقافي أكدال – الرباط\n\nنتشرف بحضوركم.`;
  let sent = false;
  let detail = "";
  let attempts = 0;
  for (attempts = 1; attempts <= 3 && !sent; attempts += 1) {
    try {
      await transporter.sendMail({ from: `"مؤسسة أطر الغد" <${smtpFrom}>`, to: recipient.email, subject, html, text, attachments: [{ filename: "invitation-edition-18.jpeg", path: imagePath, cid: "opening-invitation", contentType: "image/jpeg" }] });
      sent = true;
    } catch (error) {
      detail = error instanceof Error ? error.message : "SEND_FAILED";
      if (attempts < 3) await new Promise((resolve) => setTimeout(resolve, attempts * 1500));
    }
  }
  appendFileSync(reportPath, `${recipient.email},${sent ? "sent" : "failed"},${Math.min(attempts, 3)},${JSON.stringify(detail)}\n`, "utf8");
}

transporter.close();
console.log(`Completed at ${new Date().toISOString()}. Report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
