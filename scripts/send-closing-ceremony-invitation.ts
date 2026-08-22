import "dotenv/config";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

const imagePath = process.env.CLOSING_INVITATION_IMAGE_PATH
  || "storage/closing-ceremony/edition-18-closing-invitation.jpeg";
const logoPath = process.env.EMAIL_LOGO_PATH || "public/images/logo.png";
const reportPath = process.env.CLOSING_INVITATION_REPORT_PATH
  || "storage/closing-ceremony-email-report.csv";
const sentMarkerPath = process.env.CLOSING_INVITATION_SENT_MARKER
  || "storage/.closing-ceremony-invitation-sent";
const testArgument = process.argv.find((argument) => argument.startsWith("--test-email="));
const testEmail = testArgument?.slice("--test-email=".length).trim().toLowerCase();
const sendAll = process.argv.includes("--send-all");

if (!testEmail && !sendAll) {
  throw new Error("Safe mode: use --test-email=address@example.com or --send-all");
}
if (testEmail && sendAll) throw new Error("Choose either test mode or bulk mode, not both");
if (sendAll && existsSync(sentMarkerPath)) {
  console.log(`Campaign already completed: ${sentMarkerPath}`);
  process.exit(0);
}
if (!existsSync(imagePath)) throw new Error(`Invitation image not found: ${imagePath}`);
if (!existsSync(logoPath)) throw new Error(`Email logo not found: ${logoPath}`);

const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || "noreply@atralghad.org";
if (!smtpHost || !smtpUser || !smtpPass) throw new Error("SMTP configuration is incomplete");

type Recipient = { firstName: string; email: string };
const recipients: Recipient[] = [];
let db: mysql.Connection | null = null;

if (testEmail) {
  recipients.push({ firstName: "Ismail", email: testEmail });
} else {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  db = await mysql.createConnection(process.env.DATABASE_URL);
  await db.query(`CREATE TABLE IF NOT EXISTS email_campaign_deliveries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaignKey VARCHAR(100) NOT NULL,
    email VARCHAR(320) NOT NULL,
    status ENUM('sending','sent','failed') NOT NULL DEFAULT 'sending',
    error TEXT NULL,
    sentAt TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY email_campaign_delivery_unique (campaignKey, email)
  )`);
  const [rows] = await db.query<mysql.RowDataPacket[]>(`
    SELECT firstName, email FROM (
      SELECT firstName, email, createdAt FROM new_users
      WHERE email IS NOT NULL AND LENGTH(TRIM(email)) > 0
      UNION ALL
      SELECT COALESCE(NULLIF(SUBSTRING_INDEX(name, ' ', 1), ''), '') firstName, email, createdAt
      FROM users WHERE email IS NOT NULL AND LENGTH(TRIM(email)) > 0
    ) all_accounts ORDER BY createdAt
  `);
  const unique = new Map<string, Recipient>();
  for (const row of rows) {
    const email = String(row.email).trim().toLowerCase();
    if (!unique.has(email)) unique.set(email, { firstName: String(row.firstName || "").trim(), email });
  }
  recipients.push(...unique.values());
}

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

const subject = "دعوة لحضور الحفل الختامي لأكاديمية أطر الغد – دورة الأثر";
const campaignKey = "closing-ceremony-2026-08-23";
appendFileSync(reportPath, `\nstarted_at,mode,total\n${new Date().toISOString()},${testEmail ? "test" : "bulk"},${recipients.length}\nemail,status,detail\n`, "utf8");

for (const recipient of recipients) {
  if (db) {
    const [claim] = await db.execute<mysql.ResultSetHeader>(
      `INSERT INTO email_campaign_deliveries (campaignKey,email,status) VALUES (?,?,'sending')
       ON DUPLICATE KEY UPDATE
         status=IF(status='failed','sending',status),
         error=IF(status='failed',NULL,error)`,
      [campaignKey, recipient.email],
    );
    if (claim.affectedRows === 0) {
      console.log(`${recipient.email}: skipped (already processed)`);
      continue;
    }
  }
  const safeName = recipient.firstName.replace(/[&<>"']/g, (value) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[value]!);
  const greeting = safeName ? `<p style="margin:0 0 16px">مرحباً ${safeName}،</p>` : "";
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f2f7f6;font-family:Tahoma,Arial,sans-serif;color:#173f39"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 10px"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 35px rgba(23,63,57,.12)"><tr><td align="center" style="padding:26px 24px 20px;border-bottom:1px solid #e3eeeb"><img src="cid:foundation-logo" width="190" alt="مؤسسة أطر الغد" style="display:block;width:190px;max-width:70%;height:auto;border:0"><p style="margin:10px 0 0;color:#5e7772;font-size:13px">Future Leaders Foundation</p></td></tr><tr><td style="padding:30px;text-align:right;font-size:16px;line-height:2"><p style="margin:0 0 16px">السلام عليكم ورحمة الله وبركاته،</p>${greeting}<h1 style="margin:0 0 14px;color:#116575;font-size:27px;line-height:1.5">دعوة لحضور الحفل الختامي</h1><p style="margin:0 0 22px">يسر أكاديمية أطر الغد دعوتكم لمشاركتنا فعاليات الحفل الختامي للدورة الثامنة عشرة <strong>دورة الأثر</strong>.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f5faf9;border:1px solid #dceae7;border-radius:14px"><tr><td align="center" style="padding:18px 8px;border-left:1px solid #dceae7"><strong style="display:block;color:#116575;font-size:17px">الأحد 23 غشت 2026</strong><span style="color:#60736f;font-size:13px">التاريخ</span></td><td align="center" style="padding:18px 8px;border-left:1px solid #dceae7"><strong style="display:block;color:#116575;font-size:17px">الساعة 18:00</strong><span style="color:#60736f;font-size:13px">السادسة مساءً</span></td><td align="center" style="padding:18px 8px"><strong style="display:block;color:#116575;font-size:17px">سينما ميغاراما</strong><span style="color:#60736f;font-size:13px">سلا</span></td></tr></table><p style="margin:22px 0 0;text-align:center;font-weight:bold;color:#116575">حضوركم يسعدنا ويزيد هذا الموعد بهاءً</p></td></tr><tr><td align="center" style="padding:0 12px 28px"><img src="cid:closing-invitation" alt="دعوة الحفل الختامي" style="display:block;width:100%;max-width:616px;height:auto;border:0;border-radius:12px"></td></tr><tr><td align="center" style="padding:20px;background:#173f39;color:#fff;font-size:13px;line-height:1.8">مؤسسة أطر الغد<br>Future Leaders Foundation</td></tr></table></td></tr></table></body></html>`;
  const text = `السلام عليكم ورحمة الله وبركاته،\n\nيسر أكاديمية أطر الغد دعوتكم لمشاركتنا فعاليات الحفل الختامي للدورة الثامنة عشرة «دورة الأثر».\n\nالأحد 23 غشت 2026، الساعة السادسة مساءً، سينما ميغاراما سلا.`;
  let status = "sent";
  let detail = "";
  try {
    await transporter.sendMail({
      from: `"مؤسسة أطر الغد" <${smtpFrom}>`,
      to: recipient.email,
      subject,
      html,
      text,
      attachments: [
        { filename: "logo.png", path: logoPath, cid: "foundation-logo", contentType: "image/png" },
        { filename: "دعوة-الحفل-الختامي.jpeg", path: imagePath, cid: "closing-invitation", contentType: "image/jpeg" },
      ],
    });
  } catch (error) {
    status = "failed";
    detail = error instanceof Error ? error.message : "SEND_FAILED";
  }
  if (db) {
    await db.execute(
      "UPDATE email_campaign_deliveries SET status=?,error=?,sentAt=? WHERE campaignKey=? AND email=?",
      [status, detail || null, status === "sent" ? new Date() : null, campaignKey, recipient.email],
    );
  }
  appendFileSync(reportPath, `${recipient.email},${status},${JSON.stringify(detail)}\n`, "utf8");
  console.log(`${recipient.email}: ${status}`);
}

transporter.close();
if (db) {
  const [remainingRows] = await db.execute<mysql.RowDataPacket[]>(
    "SELECT COUNT(*) remaining FROM email_campaign_deliveries WHERE campaignKey=? AND status<>'sent'",
    [campaignKey],
  );
  const remaining = Number(remainingRows[0]?.remaining ?? 0);
  await db.end();
  if (remaining === 0) writeFileSync(sentMarkerPath, `${new Date().toISOString()}\n`, "utf8");
  else console.error(`Campaign incomplete: ${remaining} delivery failure(s) remain.`);
}
console.log(`Completed. Report: ${reportPath}`);
