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
const AR_INTERVIEW_REMINDER = "\u062A\u0630\u0643\u064A\u0631 \u0628\u0645\u0648\u0639\u062F \u0627\u0644\u0645\u0642\u0627\u0628\u0644\u0629 \u0627\u0644\u0634\u0641\u0648\u064A\u0629";
const AR_INTERVIEW_IN_24H = "\u0645\u0648\u0639\u062F \u0645\u0642\u0627\u0628\u0644\u062A\u0643 \u0627\u0644\u0634\u0641\u0648\u064A\u0629 \u063A\u062F\u0627\u064B";
const AR_INTERVIEW_IN_1H = "\u0645\u0648\u0639\u062F \u0645\u0642\u0627\u0628\u0644\u062A\u0643 \u0627\u0644\u0634\u0641\u0648\u064A\u0629 \u0628\u0639\u062F \u0633\u0627\u0639\u0629";
const AR_INTERVIEW_DATE = "\u062A\u0627\u0631\u064A\u062E \u0648\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0645\u0642\u0627\u0628\u0644\u0629";
const AR_MOROCCO_TIME = "\u0628\u062A\u0648\u0642\u064A\u062A \u0627\u0644\u0645\u063A\u0631\u0628";
const AR_JOIN_MEET = "\u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0627\u0644\u0645\u0642\u0627\u0628\u0644\u0629";
const AR_MEET_HELP = "\u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0642\u0628\u0644 \u0627\u0644\u0645\u0648\u0639\u062F \u0628\u062E\u0645\u0633 \u062F\u0642\u0627\u0626\u0642\u060C \u0648\u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u062C\u0627\u0647\u0632\u064A\u0629 \u0627\u0644\u0643\u0627\u0645\u064A\u0631\u0627 \u0648\u0627\u0644\u0645\u064A\u0643\u0631\u0648\u0641\u0648\u0646.";
const AR_LINK_FALLBACK = "\u0625\u0630\u0627 \u0644\u0645 \u064A\u0639\u0645\u0644 \u0627\u0644\u0632\u0631\u060C \u064A\u0645\u0643\u0646\u0643 \u0646\u0633\u062E \u0627\u0644\u0631\u0627\u0628\u0637 \u0627\u0644\u062A\u0627\u0644\u064A:";

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

function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

async function sendMailWithRetry(
  options: Parameters<typeof transporter.sendMail>[0],
  maxAttempts = 3,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await transporter.sendMail(options);
      return { success: true as const, attempts: attempt };
    } catch (error) {
      lastError = error;
      console.error(`[Email] Send attempt ${attempt}/${maxAttempts} failed:`, error);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  return {
    success: false as const,
    attempts: maxAttempts,
    reason: lastError instanceof Error ? lastError.message : "SEND_FAILED",
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
  isExtensionPeriod = false,
) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping candidate reminder email.");
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const formUrl = `${PUBLIC_APP_URL}/signin?redirect=/candidate-questionnaire`;
  const logo = getEmailLogo();
  const dayWord = daysLeft === 1 ? "يوم واحد" : `${daysLeft} أيام`;
  const subject = isExtensionPeriod
    ? `تم تمديد أجل التسجيل إلى ${deadlineLabel} - فرصة أخيرة لا تفوتها`
    : `تذكير بإتمام استمارة أكاديمية أطر الغد - بقي ${dayWord}`;
  const badge = isExtensionPeriod ? "تم تمديد أجل التسجيل" : "تذكير مهم";
  const headline = isExtensionPeriod
    ? `فرصة إضافية: تم تمديد التسجيل إلى ${deadlineLabel}`
    : `لم يتبق سوى ${dayWord} لإتمام استمارة المشاركة`;
  const opportunityMessage = isExtensionPeriod
    ? "استجابةً للطلبات، تم تمديد أجل التسجيل بشكل استثنائي. هذه فرصة إضافية وأخيرة لإتمام استمارتكم وإرسال ترشحكم، فلا تؤجلوا الخطوة واستفيدوا من الوقت المتاح الآن."
    : "ندعوكم إلى إتمام تعبئة الاستمارة قبل انتهاء الأجل المحدد حتى يتم أخذ ترشحكم بعين الاعتبار ضمن مراحل الانتقاء.";
  const deadlineTitle = isExtensionPeriod ? "الأجل الجديد بعد التمديد" : "الأجل المتبقي";

  const html = `
    <div dir="rtl" lang="ar" style="margin:0;padding:0;background:#f3f7f6;font-family:Arial,Tahoma,sans-serif;color:#173f39;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7f6;padding:28px 12px;">
        <tr><td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(23,63,57,0.12);">
            <tr><td style="background:linear-gradient(135deg,#1f5148 0%,#4A9B8E 58%,#8fd3c5 100%);padding:34px 30px;text-align:right;color:#ffffff;">
              <img src="${logo.src}" width="180" alt="Future Leaders Foundation" style="display:block;width:180px;max-width:100%;height:auto;margin:0 0 22px auto;background:#ffffff;border-radius:12px;padding:10px;">
              <div style="display:inline-block;background:rgba(255,255,255,0.16);border-radius:999px;padding:7px 14px;font-size:13px;font-weight:700;margin-bottom:18px;">${badge}</div>
              <h1 style="margin:0;font-size:28px;line-height:1.45;font-weight:800;">${headline}</h1>
              <p style="margin:14px 0 0;font-size:16px;line-height:1.9;color:rgba(255,255,255,0.92);">أكاديمية أطر الغد - الدورة الثامنة عشرة، دورة الأثر</p>
            </td></tr>
            <tr><td style="padding:30px;text-align:right;">
              <p style="margin:0 0 18px;font-size:17px;line-height:1.9;color:#253b37;">مرحباً ${firstName || ""}،</p>
              <p style="margin:0 0 18px;font-size:16px;line-height:1.95;color:#3f5550;">لاحظنا أنكم قمتم بإنشاء حسابكم على منصة مؤسسة أطر الغد، لكن استمارة المشاركة في الدورة الثامنة عشرة لم تُستكمل أو لم تُرسل بعد.</p>
              <p style="margin:0 0 22px;font-size:16px;line-height:1.95;color:#3f5550;">${opportunityMessage}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#f4fbf9;border:1px solid #d8eee9;border-radius:14px;"><tr><td style="padding:18px 20px;">
                <p style="margin:0 0 8px;font-size:14px;color:#4A9B8E;font-weight:800;">${deadlineTitle}</p>
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
  const dateLabel = new Intl.DateTimeFormat("ar-MA", {
    timeZone: "Africa/Casablanca",
    dateStyle: "full",
    timeStyle: "short",
  }).format(startTime);
  const reminderLabel = reminderType === "24h" ? AR_INTERVIEW_IN_24H : AR_INTERVIEW_IN_1H;
  const safeFirstName = escapeEmailHtml(firstName || "");
  const safeMeetingUrl = escapeEmailHtml(meetingUrl);
  const subject = `${reminderLabel} - ${AR_ORG}`;
  const html = `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body dir="rtl" style="margin:0;padding:0;background-color:#f2f7f6;font-family:Tahoma,Arial,sans-serif;color:#173f39;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${reminderLabel} — ${dateLabel}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f2f7f6;">
          <tr><td align="center" style="padding:24px 12px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
              <tr><td align="center" style="padding:28px 24px 20px;border-bottom:1px solid #e5eeec;">
                <img src="${logo.src}" width="190" alt="Future Leaders Foundation" style="display:block;width:190px;max-width:80%;height:auto;border:0;">
              </td></tr>
              <tr><td style="padding:32px 32px 12px;text-align:right;">
                <p style="margin:0 0 10px;color:#4A9B8E;font-size:14px;font-weight:bold;">${AR_INTERVIEW_REMINDER}</p>
                <h1 style="margin:0 0 22px;color:#173f39;font-size:25px;line-height:1.5;">${reminderLabel}</h1>
                <p style="margin:0 0 12px;font-size:17px;line-height:1.9;">${AR_HELLO} ${safeFirstName}\u060C</p>
                <p style="margin:0;font-size:16px;line-height:1.9;color:#425e59;">${AR_MEET_HELP}</p>
              </td></tr>
              <tr><td style="padding:18px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#eef8f6;border:1px solid #cfe6e1;border-radius:12px;">
                  <tr><td align="center" style="padding:20px;">
                    <p style="margin:0 0 8px;color:#4A9B8E;font-size:13px;font-weight:bold;">${AR_INTERVIEW_DATE}</p>
                    <p style="margin:0;color:#173f39;font-size:18px;font-weight:bold;line-height:1.7;">${dateLabel}</p>
                    <p style="margin:5px 0 0;color:#647c77;font-size:12px;">${AR_MOROCCO_TIME}</p>
                  </td></tr>
                </table>
              </td></tr>
              <tr><td align="center" style="padding:10px 32px 28px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                  <td bgcolor="#4A9B8E" style="border-radius:9px;text-align:center;">
                    <a href="${safeMeetingUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 30px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">${AR_JOIN_MEET}</a>
                  </td>
                </tr></table>
                <p style="margin:24px 0 8px;color:#788d89;font-size:12px;line-height:1.7;">${AR_LINK_FALLBACK}</p>
                <a href="${safeMeetingUrl}" target="_blank" rel="noopener noreferrer" dir="ltr" style="display:inline-block;max-width:100%;color:#4A9B8E;font-size:12px;word-break:break-all;">${safeMeetingUrl}</a>
              </td></tr>
              <tr><td align="center" style="padding:20px 24px;background-color:#173f39;color:#dceae7;font-size:12px;line-height:1.8;">
                ${AR_ORG}<br>Future Leaders Foundation
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
  const text = [
    reminderLabel,
    `${AR_HELLO} ${firstName || ""}\u060C`,
    `${AR_INTERVIEW_DATE}: ${dateLabel} (${AR_MOROCCO_TIME})`,
    AR_MEET_HELP,
    `${AR_JOIN_MEET}: ${meetingUrl}`,
    AR_ORG,
  ].join("\n\n");

  try {
    await transporter.sendMail({
      from: `"${AR_ORG}" <${SMTP_FROM}>`,
      to,
      subject,
      html,
      text,
      attachments: logo.attachments,
    });
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send interview reminder:", error);
    return { success: false, reason: "SEND_FAILED" };
  }
}

export async function sendInterviewUpdateEmail(
  to: string,
  firstName: string,
  type: "assigned" | "slots_available" | "cancelled" | "reassigned",
  interviewer?: {
    name: string;
    email: string;
    phoneNumber?: string | null;
  },
) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping interview update email.");
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const messages = {
    assigned: {
      eyebrow: "تهانينا!",
      subject: "تم اختيارك للانتقال إلى مرحلة المقابلة الشفوية",
      title: "لقد تم قبول طلبك للانتقال إلى مرحلة المقابلة",
      body: "يسرّ مؤسسة أطر الغد إخبارك بأنه تم اختيارك للانتقال إلى مرحلة المقابلة الشفوية عبر الفيديو. يرجى الدخول إلى فضاء المقابلة واختيار الموعد الذي يناسبك من بين المواعيد المتاحة.",
      note: "هذه المرحلة جزء من مسار الانتقاء، ولا تعني القبول النهائي في البرنامج.",
      button: "اختيار موعد المقابلة",
    },
    slots_available: {
      eyebrow: "مواعيد جديدة متاحة",
      subject: "يمكنك الآن اختيار موعد مقابلتك",
      title: "اختر الموعد الذي يناسبك",
      body: "تمت إضافة مواعيد جديدة لمقابلتك الشفوية عبر الفيديو. يرجى الدخول إلى فضاء المقابلة واختيار الموعد المناسب في أقرب وقت.",
      note: "بعد حجز الموعد، ستجد تفاصيل المقابلة ورابط Google Meet داخل فضائك.",
      button: "عرض المواعيد المتاحة",
    },
    cancelled: {
      eyebrow: "تحديث بخصوص مقابلتك",
      subject: "تم إلغاء موعد مقابلتك السابق",
      title: "يرجى اختيار موعد جديد",
      body: "نحيطك علماً بأنه تم إلغاء موعد مقابلتك السابق. يرجى الدخول إلى فضاء المقابلة للاطلاع على المواعيد الجديدة واختيار الموعد الذي يناسبك.",
      note: "لن تتلقى أي تذكير بخصوص الموعد الملغى. ستبدأ التذكيرات من جديد بعد اختيار موعد جديد. نعتذر عن هذا التغيير ونشكرك على تفهّمك.",
      button: "اختيار موعد جديد",
    },
    reassigned: {
      eyebrow: "تحديث بخصوص مقابلتك",
      subject: "تم تحديث المسؤول عن مقابلتك",
      title: "تم تعيين مسؤول جديد لمقابلتك",
      body: "تم تحديث المسؤول عن مقابلتك الشفوية. يمكنك الدخول إلى فضاء المقابلة للاطلاع على المواعيد المتاحة واختيار الموعد الذي يناسبك.",
      note: "إذا كنت قد حجزت موعداً من قبل، ستظهر لك أحدث التفاصيل داخل فضائك.",
      button: "فتح فضاء المقابلة",
    },
  } as const;
  const message = messages[type];
  const interviewUrl = `${PUBLIC_APP_URL}/interview`;
  const logo = getEmailLogo();
  const safeFirstName = escapeEmailHtml(firstName || "");
  const safeInterviewUrl = escapeEmailHtml(interviewUrl);
  const safeInterviewerName = interviewer ? escapeEmailHtml(interviewer.name) : "";
  const safeInterviewerEmail = interviewer ? escapeEmailHtml(interviewer.email) : "";
  const safeInterviewerPhone = interviewer?.phoneNumber
    ? escapeEmailHtml(interviewer.phoneNumber)
    : "";
  const subject = `${message.subject} - ${AR_ORG}`;
  const html = `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body dir="rtl" style="margin:0;padding:0;background-color:#f2f7f6;font-family:Tahoma,Arial,sans-serif;color:#173f39;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${message.title}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f2f7f6;">
          <tr>
            <td align="center" style="padding:24px 12px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
                <tr>
                  <td align="center" style="padding:28px 24px 20px;border-bottom:1px solid #e5eeec;">
                    <img src="${logo.src}" width="190" alt="Future Leaders Foundation" style="display:block;width:190px;max-width:80%;height:auto;border:0;">
                  </td>
                </tr>
                <tr>
                  <td style="padding:32px 32px 18px;text-align:right;">
                    <p style="margin:0 0 10px;color:#4A9B8E;font-size:15px;font-weight:bold;">${message.eyebrow}</p>
                    <h1 style="margin:0 0 22px;color:#173f39;font-size:25px;line-height:1.55;">${message.title}</h1>
                    <p style="margin:0 0 14px;font-size:17px;line-height:1.9;">${AR_HELLO} ${safeFirstName}،</p>
                    <p style="margin:0;color:#425e59;font-size:16px;line-height:2;">${message.body}</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:10px 32px 24px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td bgcolor="#4A9B8E" style="border-radius:9px;text-align:center;">
                          <a href="${safeInterviewUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">${message.button}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 28px;">
                    ${interviewer ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;margin-bottom:18px;background-color:#f8faf9;border-right:4px solid #4A9B8E;">
                      <tr><td style="padding:14px 16px;color:#425e59;font-size:13px;line-height:1.9;">
                        <strong>مسؤول مقابلتك: ${safeInterviewerName}</strong><br>
                        البريد الإلكتروني: <a href="mailto:${safeInterviewerEmail}" style="color:#4A9B8E;text-decoration:none;">${safeInterviewerEmail}</a><br>
                        ${safeInterviewerPhone ? `الهاتف: <a href="tel:${safeInterviewerPhone}" dir="ltr" style="color:#4A9B8E;text-decoration:none;">${safeInterviewerPhone}</a>` : ""}
                      </td></tr>
                    </table>` : ""}
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#eef8f6;border-right:4px solid #4A9B8E;">
                      <tr>
                        <td style="padding:14px 16px;color:#425e59;font-size:13px;line-height:1.8;">${message.note}</td>
                      </tr>
                    </table>
                    <p style="margin:22px 0 8px;text-align:center;color:#788d89;font-size:12px;line-height:1.7;">إذا لم يعمل الزر، انسخ الرابط التالي وافتحه في متصفحك:</p>
                    <p dir="ltr" style="margin:0;text-align:center;">
                      <a href="${safeInterviewUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;max-width:100%;color:#4A9B8E;font-size:12px;word-break:break-all;">${safeInterviewUrl}</a>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:20px 24px;background-color:#173f39;color:#dceae7;font-size:12px;line-height:1.8;">
                    ${AR_ORG}<br>Future Leaders Foundation
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
  const text = [
    message.title,
    `${AR_HELLO} ${firstName || ""}،`,
    message.body,
    interviewer ? `مسؤول المقابلة: ${interviewer.name} — ${interviewer.email}${interviewer.phoneNumber ? ` — ${interviewer.phoneNumber}` : ""}` : "",
    message.note,
    `${message.button}: ${interviewUrl}`,
    AR_ORG,
  ].join("\n\n");

  return sendMailWithRetry({
    from: `"${AR_ORG}" <${SMTP_FROM}>`,
    to,
    subject,
    html,
    text,
    attachments: logo.attachments,
  });
}

export async function sendInterviewBookingConfirmationEmail(input: {
  to: string;
  firstName: string;
  startTime: Date;
  endTime: Date;
  meetingUrl: string;
  interviewerName?: string | null;
  interviewerEmail?: string | null;
  interviewerPhoneNumber?: string | null;
  previousStartTime?: Date | null;
}) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping booking confirmation email.");
    return { success: false as const, attempts: 0, reason: "SMTP_NOT_CONFIGURED" };
  }

  const changed = Boolean(input.previousStartTime);
  const title = changed ? "تم تأكيد تغيير موعد مقابلتك" : "تم تأكيد موعد مقابلتك";
  const subject = `${title} - ${AR_ORG}`;
  const dateFormatter = new Intl.DateTimeFormat("ar-MA", {
    timeZone: "Africa/Casablanca",
    dateStyle: "full",
    timeStyle: "short",
  });
  const timeFormatter = new Intl.DateTimeFormat("ar-MA", {
    timeZone: "Africa/Casablanca",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dateLabel = dateFormatter.format(input.startTime);
  const endLabel = timeFormatter.format(input.endTime);
  const previousLabel = input.previousStartTime
    ? dateFormatter.format(input.previousStartTime)
    : null;
  const safeFirstName = escapeEmailHtml(input.firstName || "");
  const safeMeetingUrl = escapeEmailHtml(input.meetingUrl);
  const safeInterviewerName = input.interviewerName
    ? escapeEmailHtml(input.interviewerName)
    : "";
  const safeInterviewerEmail = input.interviewerEmail
    ? escapeEmailHtml(input.interviewerEmail)
    : "";
  const safeInterviewerPhoneNumber = input.interviewerPhoneNumber
    ? escapeEmailHtml(input.interviewerPhoneNumber)
    : "";
  const logo = getEmailLogo();
  const html = `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body dir="rtl" style="margin:0;padding:0;background-color:#f2f7f6;font-family:Tahoma,Arial,sans-serif;color:#173f39;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${title} — ${dateLabel}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f2f7f6;">
          <tr><td align="center" style="padding:24px 12px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
              <tr><td align="center" style="padding:28px 24px 20px;border-bottom:1px solid #e5eeec;">
                <img src="${logo.src}" width="190" alt="Future Leaders Foundation" style="display:block;width:190px;max-width:80%;height:auto;border:0;">
              </td></tr>
              <tr><td style="padding:32px 32px 16px;text-align:right;">
                <p style="margin:0 0 10px;color:#4A9B8E;font-size:15px;font-weight:bold;">المقابلة الشفوية عبر الفيديو</p>
                <h1 style="margin:0 0 20px;color:#173f39;font-size:25px;line-height:1.55;">${title}</h1>
                <p style="margin:0 0 12px;font-size:17px;line-height:1.9;">${AR_HELLO} ${safeFirstName}،</p>
                <p style="margin:0;color:#425e59;font-size:16px;line-height:1.9;">${changed ? "تم تسجيل موعدك الجديد بنجاح. تجد أدناه التفاصيل المحدّثة للمقابلة." : "تم تسجيل اختيارك بنجاح. تجد أدناه تفاصيل المقابلة الشفوية عبر الفيديو."}</p>
              </td></tr>
              ${previousLabel ? `<tr><td style="padding:4px 32px 10px;">
                <p style="margin:0;padding:12px 16px;background:#fff6e8;color:#8a5a12;font-size:13px;line-height:1.7;border-right:4px solid #e7a93e;">الموعد السابق: <span style="text-decoration:line-through;">${previousLabel}</span></p>
              </td></tr>` : ""}
              <tr><td style="padding:12px 32px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#eef8f6;border:1px solid #cfe6e1;border-radius:12px;">
                  <tr><td align="center" style="padding:20px;">
                    <p style="margin:0 0 8px;color:#4A9B8E;font-size:13px;font-weight:bold;">الموعد المؤكد</p>
                    <p style="margin:0;color:#173f39;font-size:18px;font-weight:bold;line-height:1.7;">${dateLabel}</p>
                    <p style="margin:5px 0 0;color:#647c77;font-size:13px;">إلى الساعة ${endLabel} — بتوقيت المغرب</p>
                    ${safeInterviewerName ? `<p style="margin:10px 0 0;color:#425e59;font-size:14px;">مسؤول المقابلة: <strong>${safeInterviewerName}</strong></p>` : ""}
                  </td></tr>
                </table>
              </td></tr>
              ${(safeInterviewerEmail || safeInterviewerPhoneNumber) ? `<tr><td style="padding:0 32px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f8faf9;border-right:4px solid #4A9B8E;">
                  <tr><td style="padding:14px 16px;color:#425e59;font-size:13px;line-height:1.9;">
                    <strong>للتواصل مع مسؤول المقابلة في حالة وجود مشكلة:</strong><br>
                    ${safeInterviewerEmail ? `البريد الإلكتروني: <a href="mailto:${safeInterviewerEmail}" style="color:#4A9B8E;text-decoration:none;">${safeInterviewerEmail}</a><br>` : ""}
                    ${safeInterviewerPhoneNumber ? `الهاتف: <a href="tel:${safeInterviewerPhoneNumber}" dir="ltr" style="color:#4A9B8E;text-decoration:none;">${safeInterviewerPhoneNumber}</a>` : ""}
                  </td></tr>
                </table>
              </td></tr>` : ""}
              <tr><td align="center" style="padding:4px 32px 26px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                  <td bgcolor="#4A9B8E" style="border-radius:9px;text-align:center;">
                    <a href="${safeMeetingUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">الانضمام إلى المقابلة عبر Google Meet</a>
                  </td>
                </tr></table>
                <p style="margin:22px 0 8px;color:#788d89;font-size:12px;line-height:1.7;">إذا لم يعمل الزر، انسخ رابط المقابلة التالي:</p>
                <a href="${safeMeetingUrl}" target="_blank" rel="noopener noreferrer" dir="ltr" style="display:inline-block;max-width:100%;color:#4A9B8E;font-size:12px;word-break:break-all;">${safeMeetingUrl}</a>
                <p style="margin:22px 0 0;color:#425e59;font-size:13px;line-height:1.8;">يرجى الانضمام قبل الموعد بخمس دقائق والتأكد من جاهزية الكاميرا والميكروفون.</p>
              </td></tr>
              <tr><td align="center" style="padding:20px 24px;background-color:#173f39;color:#dceae7;font-size:12px;line-height:1.8;">
                ${AR_ORG}<br>Future Leaders Foundation
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
  const text = [
    title,
    `${AR_HELLO} ${input.firstName || ""}،`,
    previousLabel ? `الموعد السابق: ${previousLabel}` : "",
    `الموعد المؤكد: ${dateLabel} إلى ${endLabel} (${AR_MOROCCO_TIME})`,
    input.interviewerName ? `مسؤول المقابلة: ${input.interviewerName}` : "",
    input.interviewerEmail ? `البريد الإلكتروني للمسؤول: ${input.interviewerEmail}` : "",
    input.interviewerPhoneNumber ? `هاتف المسؤول: ${input.interviewerPhoneNumber}` : "",
    `رابط Google Meet: ${input.meetingUrl}`,
    AR_ORG,
  ].filter(Boolean).join("\n\n");

  return sendMailWithRetry({
    from: `"${AR_ORG}" <${SMTP_FROM}>`,
    to: input.to,
    subject,
    html,
    text,
    attachments: logo.attachments,
  });
}

export async function sendInterviewAdminBookingNotificationEmail(input: {
  to: string;
  adminName: string;
  candidateName: string;
  startTime: Date;
  endTime: Date;
  previousStartTime?: Date | null;
}) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping mini-admin booking notification.");
    return { success: false as const, attempts: 0, reason: "SMTP_NOT_CONFIGURED" };
  }

  const changed = Boolean(input.previousStartTime);
  const title = changed
    ? "قام أحد المرشحين بتغيير موعد مقابلته"
    : "قام أحد المرشحين باختيار موعد مقابلته";
  const subject = `${title} - ${AR_ORG}`;
  const dateFormatter = new Intl.DateTimeFormat("ar-MA", {
    timeZone: "Africa/Casablanca",
    dateStyle: "full",
    timeStyle: "short",
  });
  const timeFormatter = new Intl.DateTimeFormat("ar-MA", {
    timeZone: "Africa/Casablanca",
    hour: "2-digit",
    minute: "2-digit",
  });
  const newDateLabel = dateFormatter.format(input.startTime);
  const endLabel = timeFormatter.format(input.endTime);
  const previousLabel = input.previousStartTime
    ? dateFormatter.format(input.previousStartTime)
    : null;
  const safeAdminName = escapeEmailHtml(input.adminName || "");
  const safeCandidateName = escapeEmailHtml(input.candidateName);
  const adminUrl = `${PUBLIC_APP_URL}/admin/interviews`;
  const safeAdminUrl = escapeEmailHtml(adminUrl);
  const logo = getEmailLogo();
  const html = `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body dir="rtl" style="margin:0;padding:0;background-color:#f2f7f6;font-family:Tahoma,Arial,sans-serif;color:#173f39;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${title} — ${safeCandidateName}</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#f2f7f6;">
          <tr><td align="center" style="padding:24px 12px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
              <tr><td align="center" style="padding:28px 24px 20px;border-bottom:1px solid #e5eeec;">
                <img src="${logo.src}" width="190" alt="Future Leaders Foundation" style="display:block;width:190px;max-width:80%;height:auto;border:0;">
              </td></tr>
              <tr><td style="padding:32px 32px 16px;text-align:right;">
                <p style="margin:0 0 10px;color:#4A9B8E;font-size:15px;font-weight:bold;">إشعار جديد في فضاء المقابلات</p>
                <h1 style="margin:0 0 20px;color:#173f39;font-size:24px;line-height:1.55;">${title}</h1>
                <p style="margin:0 0 12px;font-size:17px;line-height:1.9;">${AR_HELLO} ${safeAdminName}،</p>
                <p style="margin:0;color:#425e59;font-size:16px;line-height:1.9;">${changed ? "قام المرشح التالي بتغيير موعد مقابلته معك:" : "قام المرشح التالي باختيار موعد لإجراء المقابلة معك:"}</p>
              </td></tr>
              <tr><td style="padding:8px 32px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background-color:#eef8f6;border:1px solid #cfe6e1;border-radius:12px;">
                  <tr><td style="padding:20px;text-align:right;">
                    <p style="margin:0 0 12px;color:#173f39;font-size:18px;font-weight:bold;">${safeCandidateName}</p>
                    ${previousLabel ? `<p style="margin:0 0 10px;color:#8a5a12;font-size:13px;">الموعد السابق: <span style="text-decoration:line-through;">${previousLabel}</span></p>` : ""}
                    <p style="margin:0;color:#425e59;font-size:15px;line-height:1.8;">الموعد ${changed ? "الجديد" : "المختار"}: <strong>${newDateLabel}</strong></p>
                    <p style="margin:5px 0 0;color:#647c77;font-size:13px;">إلى الساعة ${endLabel} — بتوقيت المغرب</p>
                  </td></tr>
                </table>
              </td></tr>
              <tr><td align="center" style="padding:4px 32px 28px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
                  <td bgcolor="#4A9B8E" style="border-radius:9px;text-align:center;">
                    <a href="${safeAdminUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">فتح فضاء إدارة المقابلات</a>
                  </td>
                </tr></table>
                <p style="margin:22px 0 8px;color:#788d89;font-size:12px;">إذا لم يعمل الزر، استخدم الرابط التالي:</p>
                <a href="${safeAdminUrl}" target="_blank" rel="noopener noreferrer" dir="ltr" style="display:inline-block;max-width:100%;color:#4A9B8E;font-size:12px;word-break:break-all;">${safeAdminUrl}</a>
              </td></tr>
              <tr><td align="center" style="padding:20px 24px;background-color:#173f39;color:#dceae7;font-size:12px;line-height:1.8;">
                ${AR_ORG}<br>Future Leaders Foundation
              </td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
  const text = [
    title,
    `${AR_HELLO} ${input.adminName || ""}،`,
    `المرشح: ${input.candidateName}`,
    previousLabel ? `الموعد السابق: ${previousLabel}` : "",
    `الموعد ${changed ? "الجديد" : "المختار"}: ${newDateLabel} إلى ${endLabel}`,
    `فضاء إدارة المقابلات: ${adminUrl}`,
    AR_ORG,
  ].filter(Boolean).join("\n\n");

  return sendMailWithRetry({
    from: `"${AR_ORG}" <${SMTP_FROM}>`,
    to: input.to,
    subject,
    html,
    text,
    attachments: logo.attachments,
  });
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
