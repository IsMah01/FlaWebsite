import "dotenv/config";
import { appendFileSync, existsSync } from "node:fs";
import mysql from "mysql2/promise";
import nodemailer from "nodemailer";

const imagePath = process.env.QURAN_INVITATION_IMAGE_PATH || "storage/quran-evening/edition-18-quran-evening.jpeg";
const logoPath = process.env.QURAN_INVITATION_LOGO_PATH || "public/images/logo.png";
const reportPath = process.env.QURAN_INVITATION_REPORT_PATH || "storage/quran-evening/email-report.csv";
const shouldSend = process.argv.includes("--send");
const targetEmail = process.argv.find((argument) => argument.startsWith("--to="))?.slice(5).trim().toLowerCase();

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  if (!existsSync(imagePath)) throw new Error(`Invitation image not found: ${imagePath}`);
  if (!existsSync(logoPath)) throw new Error(`Academy logo not found: ${logoPath}`);

  const recipients = new Map<string, { firstName: string; email: string }>();
  if (targetEmail) {
    recipients.set(targetEmail, { firstName: "Ismail", email: targetEmail });
  } else {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const [rows] = await connection.query<mysql.RowDataPacket[]>(`
      SELECT firstName, email FROM new_users WHERE email IS NOT NULL AND TRIM(email) <> ''
      UNION ALL SELECT COALESCE(NULLIF(SUBSTRING_INDEX(name, ' ', 1), ''), ''), email FROM users WHERE email IS NOT NULL AND TRIM(email) <> ''
      UNION ALL SELECT COALESCE(name, ''), email FROM newsletter_subscribers WHERE isSubscribed = TRUE AND email IS NOT NULL AND TRIM(email) <> ''
      UNION ALL SELECT COALESCE(NULLIF(SUBSTRING_INDEX(name, ' ', 1), ''), ''), email FROM admins WHERE email IS NOT NULL AND TRIM(email) <> ''
    `);
    await connection.end();
    for (const row of rows) {
      const email = String(row.email).trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !recipients.has(email)) {
        recipients.set(email, { firstName: String(row.firstName || "").trim(), email });
      }
    }
  }
  console.log(`Unique recipients: ${recipients.size}`);
  if (!shouldSend) return;

  const smtpPort = Number(process.env.SMTP_PORT || "587");
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) throw new Error("SMTP configuration is incomplete");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  const subject = "دعوة مفتوحة لحضور الأمسية القرآنية — دورة الأثر";
  appendFileSync(reportPath, `\nstarted_at,total\n${new Date().toISOString()},${recipients.size}\nemail,status,attempts,detail\n`, "utf8");

  for (const recipient of recipients.values()) {
    const greeting = recipient.firstName ? `<p style="margin:0 0 14px">مرحباً <strong>${escapeHtml(recipient.firstName)}</strong>،</p>` : "";
    const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"></head><body style="margin:0;background:#f1f8f8;font-family:Tahoma,Arial,sans-serif;color:#173f39"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px 10px"><table role="presentation" width="640" style="width:100%;max-width:640px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 30px rgba(15,91,99,.12)"><tr><td style="height:8px;background:linear-gradient(90deg,#f28c18,#49b8c5,#117b86)"></td></tr><tr><td align="center" style="padding:26px 30px 4px"><img src="cid:academy-logo" alt="أكاديمية أطر الغد" style="display:block;width:150px;max-width:45%;height:auto;border:0"></td></tr><tr><td style="padding:24px 30px 30px;text-align:right;line-height:2;font-size:16px"><p style="margin:0 0 14px">السلام عليكم ورحمة الله وبركاته،</p>${greeting}<h1 style="margin:0 0 16px;color:#0b5962;font-size:26px">دعوة مفتوحة لحضور الأمسية القرآنية</h1><p>يسرّ <strong>أكاديمية أطر الغد</strong> دعوتكم لمشاركتنا فعاليات الأمسية القرآنية للدورة الثامنة عشرة من الأكاديمية «دورة الأثر».</p><div style="margin:22px 0;padding:18px;border-radius:14px;background:#effcfd;border-right:5px solid #f28c18"><strong>📅 الثلاثاء 18 غشت 2026</strong><br><strong>🕖 الساعة السابعة مساءً (19:00)</strong><br><strong>📍 مسرح يعقوب المنصور</strong></div><p style="font-size:18px;color:#0b5962"><strong>حضوركم يسعدنا ويزيد هذا الموعد بهاءً.</strong></p><p>نتطلع إلى لقائكم في أمسية إيمانية مميزة، عامرة بتلاوة القرآن الكريم وتدبر آياته.</p></td></tr><tr><td align="center" style="padding:0 14px 28px"><img src="cid:quran-evening-invitation" alt="دعوة لحضور الأمسية القرآنية" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:12px"></td></tr><tr><td align="center" style="padding:18px;background:#0b5962;color:#fff;font-size:13px">أكاديمية أطر الغد<br>Future Leaders Academy</td></tr></table></td></tr></table></body></html>`;
    const text = `السلام عليكم ورحمة الله وبركاته،\n\nيسرّ أكاديمية أطر الغد دعوتكم لحضور الأمسية القرآنية للدورة الثامنة عشرة «دورة الأثر».\n\nالثلاثاء 18 غشت 2026\nالساعة السابعة مساءً (19:00)\nمسرح يعقوب المنصور\n\nحضوركم يسعدنا ويزيد هذا الموعد بهاءً.`;
    let sent = false, detail = "", attempts = 0;
    for (attempts = 1; attempts <= 3 && !sent; attempts++) {
      try {
        await transporter.sendMail({ from: `"أكاديمية أطر الغد" <${process.env.SMTP_FROM || "noreply@atralghad.org"}>`, to: recipient.email, subject, html, text, attachments: [{ filename: "logo-academie.png", path: logoPath, cid: "academy-logo", contentType: "image/png" }, { filename: "invitation-soiree-coranique.jpeg", path: imagePath, cid: "quran-evening-invitation", contentType: "image/jpeg" }] });
        sent = true;
      } catch (error) {
        detail = error instanceof Error ? error.message : "SEND_FAILED";
        if (attempts < 3) await new Promise((resolve) => setTimeout(resolve, attempts * 1500));
      }
    }
    appendFileSync(reportPath, `${recipient.email},${sent ? "sent" : "failed"},${Math.min(attempts, 3)},${JSON.stringify(detail)}\n`, "utf8");
  }
  transporter.close();
  console.log(`Completed. Report: ${reportPath}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
