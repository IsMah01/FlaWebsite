import nodemailer from "nodemailer";
import { existsSync } from "node:fs";
import { join } from "node:path";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "noreply@atralghad.org";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const PUBLIC_APP_URL = APP_URL.replace(/\/+$/, "");
const EMAIL_YEAR = "2026";
const LOGO_CID = "flf-logo";
const LOGO_PATHS = [
  join(process.cwd(), "public", "images", "logo.png"),
  join(process.cwd(), "apps", "frontend", "public", "images", "logo.png"),
  join(process.cwd(), "..", "frontend", "public", "images", "logo.png"),
];
const AR_ORG = "\u0645\u0624\u0633\u0633\u0629 \u0623\u0637\u0631 \u0627\u0644\u063A\u062F";
const AR_HELLO = "\u0645\u0631\u062D\u0628\u0627\u064B";
const AR_CONFIRM_BODY =
  "\u0634\u0643\u0631\u0627\u064B \u0644\u062A\u0633\u062C\u064A\u0644\u0643 \u0641\u064A \u0645\u0624\u0633\u0633\u0629 \u0623\u0637\u0631 \u0627\u0644\u063A\u062F. \u0644\u0625\u0643\u0645\u0627\u0644 \u0639\u0645\u0644\u064A\u0629 \u0627\u0644\u062A\u0633\u062C\u064A\u0644\u060C \u064A\u0631\u062C\u0649 \u0627\u0644\u0646\u0642\u0631 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u062F\u0646\u0627\u0647 \u0644\u062A\u0623\u0643\u064A\u062F \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A.";
const AR_CONFIRM_REMINDER_BODY =
  "\u0646\u0630\u0643\u0651\u0631\u0643 \u0628\u0623\u0646 \u0628\u0631\u064A\u062F\u0643 \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A \u0644\u0645 \u064A\u062A\u0645 \u062A\u0623\u0643\u064A\u062F\u0647 \u0628\u0639\u062F. \u064A\u0631\u062C\u0649 \u062A\u0623\u0643\u064A\u062F\u0647 \u0644\u0644\u062A\u0645\u0643\u0646 \u0645\u0646 \u062A\u0633\u062C\u064A\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0648\u0625\u062A\u0645\u0627\u0645 \u0627\u0633\u062A\u0645\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629. \u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062C\u062F\u064A\u062F \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 24 \u0633\u0627\u0639\u0629.";
const AR_CONFIRM_BUTTON = "\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A";
const AR_CONFIRM_REMINDER_SUBJECT = "\u062A\u0630\u0643\u064A\u0631 \u0628\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A";
const AR_COPY_LINK = "\u0623\u0648 \u0627\u0646\u0633\u062E \u0647\u0630\u0627 \u0627\u0644\u0631\u0627\u0628\u0637 \u0648\u0627\u0644\u0635\u0642\u0647 \u0641\u064A \u0627\u0644\u0645\u062A\u0635\u0641\u062D:";
const AR_IGNORE_CONFIRM =
  "\u0625\u0630\u0627 \u0644\u0645 \u062A\u0642\u0645 \u0628\u0627\u0644\u062A\u0633\u062C\u064A\u0644 \u0641\u064A \u0645\u0624\u0633\u0633\u0629 \u0623\u0637\u0631 \u0627\u0644\u063A\u062F\u060C \u064A\u0645\u0643\u0646\u0643 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629.";
const AR_RESET_BODY =
  "\u062A\u0645 \u0637\u0644\u0628 \u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0644\u062D\u0633\u0627\u0628\u0643. \u0627\u0644\u0631\u0627\u0628\u0637 \u0635\u0627\u0644\u062D \u0644\u0645\u062F\u0629 \u0633\u0627\u0639\u0629 \u0648\u0627\u062D\u062F\u0629 \u0641\u0642\u0637.";
const AR_RESET_BUTTON =
  "\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631";
const AR_IGNORE_RESET =
  "\u0625\u0630\u0627 \u0644\u0645 \u062A\u0637\u0644\u0628 \u062A\u063A\u064A\u064A\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631\u060C \u064A\u0645\u0643\u0646\u0643 \u062A\u062C\u0627\u0647\u0644 \u0647\u0630\u0647 \u0627\u0644\u0631\u0633\u0627\u0644\u0629.";
const AR_RIGHTS = "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629.";
const AR_UNSUBSCRIBE = "\u0625\u0644\u063A\u0627\u0621 \u0627\u0644\u0627\u0634\u062A\u0631\u0627\u0643";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
  tls: {
    rejectUnauthorized: false,
  },
});

function getEmailLogo() {
  const logoPath = LOGO_PATHS.find((path) => existsSync(path));

  return {
    src: logoPath ? `cid:${LOGO_CID}` : `${PUBLIC_APP_URL}/images/logo.png`,
    attachments: logoPath
      ? [{ filename: "logo.png", path: logoPath, cid: LOGO_CID }]
      : [],
  };
}

export async function sendConfirmationEmail(
  to: string,
  firstName: string,
  token: string,
  options?: { reminder?: boolean },
) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping email send.");
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const confirmUrl = `${PUBLIC_APP_URL}/confirm-email?token=${encodeURIComponent(token)}`;
  const logo = getEmailLogo();
  const isReminder = options?.reminder === true;
  const confirmationBody = isReminder ? AR_CONFIRM_REMINDER_BODY : AR_CONFIRM_BODY;

  const html = `
    <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8faf9; border-radius: 12px;">
      <div style="text-align: center; padding: 20px 0;">
        <img src="${logo.src}" width="220" alt="Future Leaders Foundation" style="display: block; width: 220px; max-width: 100%; height: auto; margin: 0 auto 18px;">
        <h1 style="color: #4A9B8E; margin: 0;">${AR_ORG}</h1>
        <p style="color: #666; margin: 8px 0 0;">Future Leaders Foundation</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
        <h2 style="color: #2d5f56; margin-bottom: 20px;">${AR_HELLO} ${firstName}!</h2>
        <p style="color: #444; line-height: 1.8; font-size: 15px;">
          ${confirmationBody}
        </p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 30px auto;">
          <tr>
            <td bgcolor="#4A9B8E" style="border-radius: 8px; text-align: center;">
              <a href="${confirmUrl}" target="_blank" rel="noopener noreferrer"
                 style="display: inline-block; background: #4A9B8E; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                ${AR_CONFIRM_BUTTON}
              </a>
            </td>
          </tr>
        </table>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 20px;">
          ${AR_COPY_LINK}<br>
          <a href="${confirmUrl}" target="_blank" rel="noopener noreferrer" style="direction: ltr; display: inline-block; margin-top: 8px; color: #4A9B8E; word-break: break-all;">${confirmUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          ${AR_IGNORE_CONFIRM}
        </p>
      </div>
      <div style="text-align: center; padding: 20px 0; color: #aaa; font-size: 12px;">
        © ${EMAIL_YEAR} ${AR_ORG}. ${AR_RIGHTS}
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${AR_ORG}" <${SMTP_FROM}>`,
      to,
      subject: `${isReminder ? AR_CONFIRM_REMINDER_SUBJECT : AR_CONFIRM_BUTTON} - ${AR_ORG}`,
      html,
      attachments: logo.attachments,
    });
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send confirmation email:", error);
    return { success: false, reason: "SEND_FAILED" };
  }
}

export async function sendPasswordResetEmail(
  to: string,
  firstName: string,
  resetUrl: string,
) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping password reset email.");
    console.log(`[Email] Password reset link: ${resetUrl}`);
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const logo = getEmailLogo();

  const html = `
    <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8faf9; border-radius: 12px;">
      <div style="text-align: center; padding: 20px 0;">
        <img src="${logo.src}" width="220" alt="Future Leaders Foundation" style="display: block; width: 220px; max-width: 100%; height: auto; margin: 0 auto 18px;">
        <h1 style="color: #4A9B8E; margin: 0;">${AR_ORG}</h1>
        <p style="color: #666; margin: 8px 0 0;">Future Leaders Foundation</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
        <h2 style="color: #2d5f56; margin-bottom: 20px;">${AR_HELLO} ${firstName}!</h2>
        <p style="color: #444; line-height: 1.8; font-size: 15px;">
          ${AR_RESET_BODY}
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #4A9B8E, #6BC4B2); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            ${AR_RESET_BUTTON}
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 20px;">
          ${AR_COPY_LINK}<br>
          <code style="direction: ltr; display: inline-block; margin-top: 8px; background: #f0f0f0; padding: 6px 12px; border-radius: 4px; font-size: 12px;">${resetUrl}</code>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          ${AR_IGNORE_RESET}
        </p>
      </div>
      <div style="text-align: center; padding: 20px 0; color: #aaa; font-size: 12px;">
        © ${EMAIL_YEAR} ${AR_ORG}. ${AR_RIGHTS}
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${AR_ORG}" <${SMTP_FROM}>`,
      to,
      subject: `${AR_RESET_BUTTON} - ${AR_ORG}`,
      html,
      attachments: logo.attachments,
    });
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send password reset email:", error);
    return { success: false, reason: "SEND_FAILED" };
  }
}

export async function sendCandidateQuestionnaireReminderEmail(
  to: string,
  firstName: string,
  daysLeft: number,
  deadlineLabel: string,
) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping candidate reminder email.");
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const formUrl = `${PUBLIC_APP_URL}/signin?redirect=/candidate-questionnaire`;
  const logo = getEmailLogo();
  const dayWord = daysLeft === 1 ? "يوم واحد" : `${daysLeft} أيام`;
  const subject = `تذكير بإتمام استمارة أكاديمية أطر الغد - بقي ${dayWord}`;

  const html = `
    <div dir="rtl" lang="ar" style="margin:0;padding:0;background:#f3f7f6;font-family:Arial,Tahoma,sans-serif;color:#173f39;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7f6;padding:28px 12px;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(23,63,57,0.12);">
            <tr><td style="background:linear-gradient(135deg,#1f5148 0%,#4A9B8E 58%,#8fd3c5 100%);padding:34px 30px;text-align:right;color:#ffffff;">
              <img src="${logo.src}" width="180" alt="Future Leaders Foundation" style="display:block;width:180px;max-width:100%;height:auto;margin:0 0 22px auto;background:#ffffff;border-radius:12px;padding:10px;">
              <div style="display:inline-block;background:rgba(255,255,255,0.16);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:700;margin-bottom:18px;">تذكير مهم</div>
              <h1 style="margin:0;font-size:28px;line-height:1.45;font-weight:800;">لم يتبق سوى ${dayWord} لإتمام استمارة المشاركة</h1>
              <p style="margin:14px 0 0;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);">أكاديمية أطر الغد - الدورة الثامنة عشرة، دورة الأثر</p>
            </td></tr>
            <tr><td style="padding:30px;text-align:right;">
              <p style="margin:0 0 18px;font-size:17px;line-height:1.9;color:#253b37;">مرحباً ${firstName || ""}،</p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.95;color:#3f5550;">لاحظنا أنكم قمتم بإنشاء حسابكم على منصة مؤسسة أطر الغد، لكن استمارة المشاركة في الدورة الثامنة عشرة لم تُستكمل أو لم تُرسل بعد.</p>
              <p style="margin:0 0 22px;font-size:16px;line-height:1.95;color:#3f5550;">ندعوكم إلى إتمام تعبئة الاستمارة قبل انتهاء الأجل المحدد حتى يتم أخذ ترشحكم بعين الاعتبار ضمن مراحل الانتقاء.</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#f4fbf9;border:1px solid #d8eee9;border-radius:14px;"><tr><td style="padding:18px 20px;">
                <p style="margin:0 0 8px;font-size:14px;color:#4A9B8E;font-weight:800;">الأجل المتبقي</p>
                <p style="margin:0;font-size:30px;line-height:1.2;color:#1f5148;font-weight:900;">${dayWord}</p>
                <p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#60736f;">آخر أجل للتسجيل: ${deadlineLabel}</p>
              </td></tr></table>
              <div style="text-align:center;margin:30px 0 26px;"><a href="${formUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#4A9B8E;color:#ffffff;text-decoration:none;border-radius:10px;padding:14px 30px;font-size:16px;font-weight:800;">إتمام الاستمارة الآن</a></div>
              <p style="margin:0;font-size:13px;line-height:1.8;color:#7a8a86;text-align:center;">إذا كان الزر لا يعمل، يمكنكم نسخ الرابط التالي وفتحه في المتصفح:<br><a href="${formUrl}" style="color:#4A9B8E;word-break:break-all;direction:ltr;display:inline-block;margin-top:6px;">${formUrl}</a></p>
            </td></tr>
            <tr><td style="padding:18px 30px;background:#f8faf9;text-align:center;color:#8a9995;font-size:12px;line-height:1.8;">${AR_ORG}<br>هذه رسالة تذكيرية آلية لمساعدتكم على إتمام ملف الترشيح داخل الآجال المحددة.</td></tr>
          </table>
        </td></tr>
      </table>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${AR_ORG}" <${SMTP_FROM}>`,
      to,
      subject,
      html,
      attachments: logo.attachments,
    });
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send candidate reminder email:", error);
    return { success: false, reason: "SEND_FAILED" };
  }
}

export async function sendInterviewReminderEmail(
  to: string,
  firstName: string,
  startTime: Date,
  meetingUrl: string,
  reminderType: "24h" | "1h",
) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping interview reminder email.");
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const logo = getEmailLogo();
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Casablanca",
    dateStyle: "full",
    timeStyle: "short",
  }).format(startTime);
  const delayLabel = reminderType === "24h" ? "24 heures" : "1 heure";
  const html = `
    <div dir="rtl" style="font-family:Arial,Tahoma,sans-serif;max-width:620px;margin:auto;padding:24px;background:#f3f7f6;color:#173f39">
      <div style="background:#fff;border-radius:16px;padding:28px;text-align:right">
        <img src="${logo.src}" width="170" alt="Future Leaders Foundation" style="display:block;margin:0 0 20px auto">
        <h1 style="color:#2d6f64;font-size:24px">تذكير بموعد المقابلة الشفوية</h1>
        <p>مرحباً ${firstName || ""}،</p>
        <p style="line-height:1.9">نذكّركم بأن موعد مقابلتكم الشفوية سيكون بعد ${delayLabel}.</p>
        <p style="font-weight:bold;line-height:1.8">${dateLabel} (توقيت المغرب)</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${meetingUrl}" style="display:inline-block;background:#4A9B8E;color:#fff;padding:13px 28px;border-radius:9px;text-decoration:none;font-weight:bold">الدخول إلى Google Meet</a>
        </div>
        <p style="font-size:12px;color:#74837f;word-break:break-all;direction:ltr;text-align:center">${meetingUrl}</p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: `"${AR_ORG}" <${SMTP_FROM}>`,
      to,
      subject: `تذكير: موعد المقابلة بعد ${delayLabel} - ${AR_ORG}`,
      html,
      attachments: logo.attachments,
    });
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send interview reminder:", error);
    return { success: false, reason: "SEND_FAILED" };
  }
}

export async function sendNewsletterEmail(
  to: string,
  subject: string,
  content: string
) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping newsletter send.");
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const logo = getEmailLogo();

  const html = `
    <div dir="rtl" style="font-family: 'Tajawal', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8faf9; border-radius: 12px;">
      <div style="text-align: center; padding: 20px 0;">
        <img src="${logo.src}" width="220" alt="Future Leaders Foundation" style="display: block; width: 220px; max-width: 100%; height: auto; margin: 0 auto 18px;">
        <h1 style="color: #4A9B8E; margin: 0;">${AR_ORG}</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
        ${content}
      </div>
      <div style="text-align: center; padding: 20px 0; color: #aaa; font-size: 12px;">
        <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color: #4A9B8E;">${AR_UNSUBSCRIBE}</a>
        <br><br>
        © ${EMAIL_YEAR} ${AR_ORG}
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"${AR_ORG}" <${SMTP_FROM}>`,
      to,
      subject,
      html,
      attachments: logo.attachments,
    });
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send newsletter:", error);
    return { success: false, reason: "SEND_FAILED" };
  }
}
