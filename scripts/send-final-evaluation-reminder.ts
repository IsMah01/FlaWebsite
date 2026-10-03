import "dotenv/config";
import { appendFileSync, existsSync } from "node:fs";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

const campaignKey = "edition-18-final-evaluation-reminder-2026-10";
const sendAll = process.argv.includes("--send-all");
const testArgument = process.argv.find((argument) => argument.startsWith("--test-email="));
const testEmail = testArgument?.slice("--test-email=".length).trim().toLowerCase();

if (sendAll && testEmail) throw new Error("Choose either --send-all or --test-email, not both");

const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const sessionUrl = `${appUrl}/espace-candidat-final`;
const logoPath = process.env.EDITION_18_EMAIL_LOGO_PATH || "public/images/edition-18-logo-color.png";
const reportPath = process.env.FINAL_EVALUATION_REMINDER_REPORT_PATH
  || "storage/final-evaluation-reminder-report.csv";

if (!existsSync(logoPath)) throw new Error(`Edition 18 logo not found: ${logoPath}`);
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");

type Recipient = { firstName: string; email: string };
const db = await mysql.createConnection(process.env.DATABASE_URL);

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

let recipients: Recipient[];
if (testEmail) {
  recipients = [{ firstName: "", email: testEmail }];
} else {
  const [rows] = await db.query<mysql.RowDataPacket[]>(`
    SELECT firstName, LOWER(TRIM(email)) AS email
    FROM final_candidate_confirmations
    WHERE status = 'confirmed'
      AND email IS NOT NULL
      AND LENGTH(TRIM(email)) > 0
    ORDER BY confirmedAt, id
  `);
  recipients = rows.map((row) => ({
    firstName: String(row.firstName || "").trim(),
    email: String(row.email).trim().toLowerCase(),
  }));
}

const uniqueRecipients = [...new Map(recipients.map((recipient) => [recipient.email, recipient])).values()];
console.log(`Confirmed Edition 18 recipients: ${uniqueRecipients.length}`);

if (!sendAll && !testEmail) {
  await db.end();
  console.log("Preview only. Use --test-email=address@example.com or --send-all to send.");
  process.exit(0);
}

const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT || "587");
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || "noreply@atralghad.org";
if (!smtpHost || !smtpUser || !smtpPass) throw new Error("SMTP configuration is incomplete");

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

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]!);
const subject = "تذكير مهم: تعبئة الاستمارة التقييمية النهائية للدورة 18";

appendFileSync(
  reportPath,
  `\nstarted_at,mode,total\n${new Date().toISOString()},${testEmail ? "test" : "bulk"},${uniqueRecipients.length}\nemail,status,detail\n`,
  "utf8",
);

for (const recipient of uniqueRecipients) {
  if (sendAll) {
    const [claim] = await db.execute<mysql.ResultSetHeader>(
      `INSERT INTO email_campaign_deliveries (campaignKey,email,status) VALUES (?,?,'sending')
       ON DUPLICATE KEY UPDATE
         status=IF(status='failed','sending',status),
         error=IF(status='failed',NULL,error)`,
      [campaignKey, recipient.email],
    );
    if (claim.affectedRows === 0) {
      console.log(`${recipient.email}: skipped (already sent or in progress)`);
      continue;
    }
  }

  const safeName = escapeHtml(recipient.firstName);
  const greeting = safeName ? `مرحباً ${safeName}،` : "مرحباً بكم،";
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f1f7f5;font-family:Tahoma,Arial,sans-serif;color:#173f39"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 14px 40px rgba(23,63,57,.12)"><tr><td align="center" style="padding:26px 24px 20px;background:linear-gradient(135deg,#eef8f5,#fff8e8);border-bottom:1px solid #dceae7"><img src="cid:edition-18-logo" width="210" alt="أكاديمية أطر الغد، الدورة 18، دورة الأثر" style="display:block;width:210px;max-width:75%;height:auto;border:0"></td></tr><tr><td style="padding:32px 30px;text-align:right;font-size:16px;line-height:2"><p style="margin:0 0 16px">السلام عليكم ورحمة الله وبركاته،</p><p style="margin:0 0 16px">${greeting}</p><h1 style="margin:0 0 16px;color:#176b61;font-size:25px;line-height:1.55">تذكير بتعبئة الاستمارة التقييمية النهائية</h1><p style="margin:0 0 16px">نذكّركم بضرورة تعبئة <strong>الاستمارة التقييمية النهائية لأكاديمية أطر الغد – الدورة الثامنة عشرة «دورة الأثر»</strong>.</p><p style="margin:0 0 22px">ستجدون الاستمارة داخل فضائكم الخاص على المنصة. نرجو منكم تخصيص بضع دقائق للإجابة عنها بعناية؛ فآراؤكم وملاحظاتكم مهمة لتقييم التجربة وتطوير الدورات المقبلة.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:8px 0 24px"><a href="${sessionUrl}" style="display:inline-block;background:#176b61;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px;padding:13px 28px;border-radius:12px">الدخول إلى فضائي وتعبئة الاستمارة</a></td></tr></table><p style="margin:0;padding:14px 16px;background:#fff8e8;border:1px solid #f1d596;border-radius:12px;color:#684e16;font-size:14px">بعد تسجيل الدخول، ستظهر الاستمارة التقييمية مباشرة في صفحة الجلسة الخاصة بكم.</p><p style="margin:22px 0 0">شكراً لتعاونكم، وللأثر الجميل الذي صنعتموه معنا.</p><p style="margin:6px 0 0;font-weight:bold;color:#176b61">فريق أكاديمية أطر الغد</p></td></tr><tr><td align="center" style="padding:20px;background:#173f39;color:#ffffff;font-size:13px;line-height:1.8">مؤسسة أطر الغد<br>Future Leaders Foundation</td></tr></table></td></tr></table></body></html>`;
  const text = `السلام عليكم ورحمة الله وبركاته،\n\n${recipient.firstName ? `مرحباً ${recipient.firstName}،` : "مرحباً بكم،"}\n\nنذكّركم بضرورة تعبئة الاستمارة التقييمية النهائية لأكاديمية أطر الغد – الدورة الثامنة عشرة «دورة الأثر». ستجدونها داخل فضائكم الخاص على المنصة.\n\nالدخول إلى فضائكم: ${sessionUrl}\n\nشكراً لتعاونكم.\nفريق أكاديمية أطر الغد`;

  let status: "sent" | "failed" = "sent";
  let detail = "";
  try {
    await transporter.sendMail({
      from: `"أكاديمية أطر الغد" <${smtpFrom}>`,
      to: recipient.email,
      subject,
      html,
      text,
      attachments: [{
        filename: "logo-edition-18.png",
        path: logoPath,
        cid: "edition-18-logo",
        contentType: "image/png",
      }],
    });
  } catch (error) {
    status = "failed";
    detail = error instanceof Error ? error.message : "SEND_FAILED";
  }

  if (sendAll) {
    await db.execute(
      "UPDATE email_campaign_deliveries SET status=?,error=?,sentAt=? WHERE campaignKey=? AND email=?",
      [status, detail || null, status === "sent" ? new Date() : null, campaignKey, recipient.email],
    );
  }
  appendFileSync(reportPath, `${recipient.email},${status},${JSON.stringify(detail)}\n`, "utf8");
  console.log(`${recipient.email}: ${status}`);
}

transporter.close();
await db.end();
console.log(`Completed. Report: ${reportPath}`);
