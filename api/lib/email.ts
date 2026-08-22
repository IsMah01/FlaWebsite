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
const FINAL_ADMISSION_PDF_PATHS = [
  join(process.cwd(), "storage", "final-admission", "edition-18-final-acceptance.pdf"),
  join(process.cwd(), "..", "..", "storage", "final-admission", "edition-18-final-acceptance.pdf"),
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

export async function sendPoliticalGameRevealEmail(input: { to: string; firstName: string; token: string }) {
  const { src, attachments } = getEmailLogo();
  const revealUrl = `${PUBLIC_APP_URL}/jeu-politique/revelation?token=${encodeURIComponent(input.token)}`;
  const name = escapeEmailHtml(input.firstName);
  const url = escapeEmailHtml(revealUrl);
  return sendMailWithRetry({
    from: SMTP_FROM,
    to: input.to,
    subject: "Jeu politique — Votre rôle confidentiel",
    attachments,
    text: `Bonjour ${input.firstName}, votre rôle pour le jeu politique est prêt. Découvrez-le ici : ${revealUrl}. Ce lien est personnel et confidentiel.`,
    html: `<div dir="rtl" style="font-family:Arial,sans-serif;background:#f3f7f6;padding:32px"><div style="max-width:600px;margin:auto;background:white;border-radius:20px;padding:32px;text-align:center"><img src="${src}" alt="FLF" style="max-height:75px"><h1 style="color:#173f39">دورك في اللعبة السياسية جاهز</h1><p style="font-size:17px;color:#475569">مرحباً ${name}، اضغط على الزر لمعرفة دورك بسرية.</p><a href="${url}" style="display:inline-block;margin:18px;padding:14px 26px;border-radius:12px;background:#4A9B8E;color:white;text-decoration:none;font-weight:bold">اكتشف دوري</a><p style="color:#b45309;font-weight:bold">هذا الرابط شخصي وسري. لا تشاركه مع أي شخص.</p></div></div>`,
  });
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

export async function sendCandidateFinalAdmissionEmail(input: { to: string; firstName: string }) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping final admission email.");
    return { success: false as const, attempts: 0, reason: "SMTP_NOT_CONFIGURED" };
  }
  const pdfPath = FINAL_ADMISSION_PDF_PATHS.find((path) => existsSync(path));
  if (!pdfPath) {
    console.error("[Email] Final admission PDF is missing.");
    return { success: false as const, attempts: 0, reason: "FINAL_ADMISSION_PDF_MISSING" };
  }

  const logo = getEmailLogo();
  const safeFirstName = escapeEmailHtml(input.firstName);
  const subject = "القبول النهائي في أكاديمية أطر الغد - دورة الأثر";
  const html = `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
      <body dir="rtl" style="margin:0;padding:0;background:#f2f7f6;font-family:Tahoma,Arial,sans-serif;color:#173f39;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f7f6;width:100%;">
          <tr><td align="center" style="padding:24px 12px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
              <tr><td align="center" style="padding:28px 24px 20px;border-bottom:1px solid #e5eeec;">
                <img src="${logo.src}" width="190" alt="Future Leaders Foundation" style="display:block;width:190px;max-width:80%;height:auto;border:0;">
              </td></tr>
              <tr><td style="padding:32px;text-align:right;font-size:16px;line-height:2;">
                <p style="margin:0 0 18px;">السلام عليكم ورحمة الله وبركاته،</p>
                ${safeFirstName ? `<p style="margin:0 0 18px;">مرحباً ${safeFirstName}،</p>` : ""}
                <p style="margin:0 0 18px;">تهنئكم إدارة أكاديمية أطر الغد لاجتيازكم الاختبارين الكتابي والشفوي بنجاح، وقبولكم في اللائحة الرئيسية للمشاركين، مما خول لكم الحصول على مقعد بين مشاركي الدورة الثامنة عشر <strong>«دورة الأثر»</strong>.</p>
                <p style="margin:0;">وعليه، المرجو الاطلاع على باقي التفاصيل بالملف المرفق أدناه.</p>
              </td></tr>
              <tr><td align="center" style="padding:20px;background:#173f39;color:#dceae7;font-size:12px;line-height:1.8;">${AR_ORG}<br>Future Leaders Foundation</td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
  const text = [
    "السلام عليكم ورحمة الله وبركاته،",
    safeFirstName ? `مرحباً ${input.firstName}،` : "",
    "تهنئكم إدارة أكاديمية أطر الغد لاجتيازكم الاختبارين الكتابي والشفوي بنجاح، وقبولكم في اللائحة الرئيسية للمشاركين، مما خول لكم الحصول على مقعد بين مشاركي الدورة الثامنة عشر «دورة الأثر».",
    "وعليه، المرجو الاطلاع على باقي التفاصيل بالملف المرفق أدناه.",
  ].filter(Boolean).join("\n\n");

  return sendMailWithRetry({
    from: `"${AR_ORG}" <${SMTP_FROM}>`,
    to: input.to,
    subject,
    html,
    text,
    attachments: [
      ...logo.attachments,
      { filename: "رسالة القبول النهائي - دورة الأثر.pdf", path: pdfPath, contentType: "application/pdf" },
    ],
  });
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

export async function sendCandidateInitialRejectionEmail(to: string, firstName: string) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping candidate rejection email.");
    return { success: false as const, attempts: 0, reason: "SMTP_NOT_CONFIGURED" };
  }

  const logo = getEmailLogo();
  const safeFirstName = escapeEmailHtml(firstName || "");
  const subject = "نتيجة مرحلة الانتقاء الأولي - أكاديمية أطر الغد";
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
    <body dir="rtl" style="margin:0;padding:0;background:#f2f7f6;font-family:Tahoma,Arial,sans-serif;color:#173f39;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
          <tr><td align="center" style="padding:26px;border-bottom:1px solid #e5eeec;"><img src="${logo.src}" width="190" alt="Future Leaders Foundation"></td></tr>
          <tr><td style="padding:30px 32px;font-size:16px;line-height:2;text-align:right;">
            <p>السلام عليكم ورحمة الله وبركاته،</p>
            ${safeFirstName ? `<p>مرحباً ${safeFirstName}،</p>` : ""}
            <p>ببالغ التقدير، تتوجه إليكم أكاديمية أطر الغد بالشكر الجزيل على تعبئتكم الاستمارة، كما نثمّن ثقتكم في رسالتها ورغبتكم الصادقة في خوض هذه التجربة.</p>
            <p>وبعد دراسة جميع الاستمارات بعناية، نأسف لإبلاغكم بأن طلبكم <strong>لم يُوفَّق في اجتياز مرحلة الانتقاء الأولي</strong> المؤهلة للمقابلات الشفوية في هذه الدورة.</p>
            <p>ونود التأكيد أن هذا القرار لا يُعدّ حكمًا على قدراتكم أو إمكاناتكم، وإنما جاء في سياق عملية انتقاء دقيقة فرضتها محدودية المقاعد، والمفاضلة بين عدد كبير من المترشحين.</p>
            <p>إن مجرد مبادرتكم إلى الترشح يعكس روحًا إيجابية ورغبة في التعلم والتطوير، وهي قيم نعتز بها ونأمل أن تظل رفيقة لكم في مسيرتكم.</p>
            <p>ندعوكم إلى مواصلة الاجتهاد وصناعة الأثر في محيطكم، كما يسعدنا أن نراكم بين المترشحين في الدورات المقبلة، فربما تكون الفرصة القادمة موعدًا للقاء.</p>
            <p>نسأل الله أن يوفقكم، ويبارك خطاكم، وأن يكتب لكم الخير حيثما حللتم.</p>
            <p>مع خالص التقدير والاحترام،</p>
            <p><strong>لجنة إعداد أكاديمية أطر الغد</strong></p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`;
  const text = `السلام عليكم ورحمة الله وبركاته،\n\n${firstName ? `مرحباً ${firstName}،\n\n` : ""}ببالغ التقدير، تتوجه إليكم أكاديمية أطر الغد بالشكر الجزيل على تعبئتكم الاستمارة، كما نثمّن ثقتكم في رسالتها ورغبتكم الصادقة في خوض هذه التجربة.\n\nوبعد دراسة جميع الاستمارات بعناية، نأسف لإبلاغكم بأن طلبكم لم يُوفَّق في اجتياز مرحلة الانتقاء الأولي المؤهلة للمقابلات الشفوية في هذه الدورة.\n\nونود التأكيد أن هذا القرار لا يُعدّ حكمًا على قدراتكم أو إمكاناتكم، وإنما جاء في سياق عملية انتقاء دقيقة فرضتها محدودية المقاعد، والمفاضلة بين عدد كبير من المترشحين.\n\nإن مجرد مبادرتكم إلى الترشح يعكس روحًا إيجابية ورغبة في التعلم والتطوير، وهي قيم نعتز بها ونأمل أن تظل رفيقة لكم في مسيرتكم.\n\nندعوكم إلى مواصلة الاجتهاد وصناعة الأثر في محيطكم، كما يسعدنا أن نراكم بين المترشحين في الدورات المقبلة، فربما تكون الفرصة القادمة موعدًا للقاء.\n\nنسأل الله أن يوفقكم، ويبارك خطاكم، وأن يكتب لكم الخير حيثما حللتم.\n\nمع خالص التقدير والاحترام،\n\nلجنة إعداد أكاديمية أطر الغد`;

  return sendMailWithRetry({
    from: `"${AR_ORG}" <${SMTP_FROM}>`,
    to,
    subject,
    html,
    text,
    attachments: logo.attachments,
  });
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

export async function sendCandidateEmailChangedEmail(input: {
  to: string;
  firstName: string;
  previousEmail: string;
}) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping candidate email-change notification.");
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const logo = getEmailLogo();
  const signInUrl = `${PUBLIC_APP_URL}/signin`;
  const safeFirstName = escapeEmailHtml(input.firstName || "");
  const safePreviousEmail = escapeEmailHtml(input.previousEmail);
  const safeNewEmail = escapeEmailHtml(input.to);
  const html = `
    <div dir="rtl" lang="ar" style="margin:0;padding:28px 12px;background:#f3f7f6;font-family:Arial,Tahoma,sans-serif;color:#173f39;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(23,63,57,.12);">
        <div style="background:linear-gradient(135deg,#1f5148,#4A9B8E);padding:30px;color:#ffffff;">
          <img src="${logo.src}" width="170" alt="Future Leaders Foundation" style="display:block;width:170px;max-width:100%;height:auto;margin:0 0 20px auto;background:#ffffff;border-radius:12px;padding:9px;">
          <h1 style="margin:0;font-size:26px;line-height:1.5;">تم تغيير بريد حسابكم الإلكتروني</h1>
        </div>
        <div style="padding:30px;font-size:16px;line-height:1.9;">
          <p>مرحباً ${safeFirstName}،</p>
          <p>قامت إدارة مؤسسة أطر الغد بتحديث عنوان البريد الإلكتروني المرتبط بحسابكم.</p>
          <div dir="ltr" style="margin:22px 0;padding:18px;background:#f4fbf9;border:1px solid #d8eee9;border-radius:12px;text-align:left;">
            <div style="color:#71827e;font-size:13px;">Ancienne adresse</div><div style="word-break:break-all;">${safePreviousEmail}</div>
            <div style="margin-top:12px;color:#71827e;font-size:13px;">Nouvelle adresse</div><div style="word-break:break-all;font-weight:700;color:#1f5148;">${safeNewEmail}</div>
          </div>
          <p>يمكنكم الآن تسجيل الدخول باستعمال البريد الجديد وكلمة المرور المعتادة.</p>
          <div style="text-align:center;margin:28px 0;"><a href="${signInUrl}" style="display:inline-block;background:#4A9B8E;color:#fff;text-decoration:none;border-radius:10px;padding:13px 28px;font-weight:800;">تسجيل الدخول</a></div>
          <p style="color:#687a76;font-size:13px;">إذا لم تطلبوا هذا التغيير، يرجى التواصل مع الإدارة فوراً.</p>
        </div>
      </div>
    </div>`;

  const result = await sendMailWithRetry({
    from: `"${AR_ORG}" <${SMTP_FROM}>`,
    to: input.to,
    subject: `تم تغيير البريد الإلكتروني لحسابكم - ${AR_ORG}`,
    html,
    attachments: logo.attachments,
  });
  return result.success
    ? { success: true as const }
    : { success: false as const, reason: "SEND_FAILED" };
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
  type: "assigned" | "slots_available" | "booking_reminder" | "cancelled" | "released" | "reassigned" | "interview_transferred",
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
      eyebrow: "نتيجة الانتقاء الأولي",
      subject: "تهانينا، لقد اجتزتم بنجاح مرحلة الانتقاء الأولي",
      title: "الانتقال إلى مرحلة المقابلة الشفوية",
      body: "يسرّنا أن نخبركم أنكم قد اجتزتم بنجاح مرحلة الانتقاء الأولي بعد دراسة استمارة ترشحكم، ووقع عليكم الاختيار للانتقال إلى المقابلة الشفوية ضمن مراحل المشاركة بأكاديمية أطر الغد في دورتها الثامنة عشر.\n\nنشكر لكم حرصكم واهتمامكم، والوقت الذي خصصتموه للإجابة عن الاستمارة، وما لمسناه من طموح وجدية ورغبة صادقة في خوض هذه التجربة.\n\nوتُعدّ المقابلة الشفوية محطة أساسية في مسار الانتقاء، تتيح لنا التعرف عليكم بشكل أعمق، والاستماع إلى أفكاركم ودوافعكم للمشاركة في الأكاديمية.\n\nلتحديد موعد المقابلة المناسب لكم، المرجو الاطلاع على الرابط التالي.",
      bodyHtml: `
        <p style="margin:0 0 18px;font-size:17px;line-height:2;">السلام عليكم ورحمة الله وبركاته،</p>
        <p style="margin:0 0 18px;color:#425e59;font-size:16px;line-height:2;">
          يسرّنا أن نخبركم أنكم قد <strong style="color:#173f39;">اجتزتم بنجاح مرحلة الانتقاء الأولي</strong>
          بعد دراسة استمارة ترشحكم، ووقع عليكم الاختيار للانتقال إلى
          <strong style="color:#173f39;">المقابلة الشفوية</strong>
          ضمن مراحل المشاركة بأكاديمية أطر الغد في دورتها الثامنة عشر.
        </p>
        <p style="margin:0 0 18px;color:#425e59;font-size:16px;line-height:2;">
          نشكر لكم حرصكم واهتمامكم، والوقت الذي خصصتموه للإجابة عن الاستمارة،
          وما لمسناه من طموح وجدية ورغبة صادقة في خوض هذه التجربة.
        </p>
        <p style="margin:0 0 18px;color:#425e59;font-size:16px;line-height:2;">
          وتُعدّ المقابلة الشفوية محطة أساسية في مسار الانتقاء، تتيح لنا التعرف عليكم
          بشكل أعمق، والاستماع إلى أفكاركم ودوافعكم للمشاركة في الأكاديمية.
        </p>
        <p style="margin:0;color:#425e59;font-size:16px;line-height:2;">
          لتحديد موعد المقابلة المناسب لكم، المرجو الاطلاع على الرابط التالي.
        </p>`,
      note: "نسأل الله لكم التوفيق، ونتطلع إلى لقائكم.<br><br><strong>لجنة إعداد أكاديمية أطر الغد</strong><br><strong>«أقوياء لبناء الوطن، أمناء لحماية الأمة.»</strong>",
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
    booking_reminder: {
      eyebrow: "تذكير بحجز المقابلة",
      subject: "تذكير: يرجى اختيار موعد مقابلتك",
      title: "لا تنس حجز موعد مقابلتك",
      body: "لم تقم بعد بحجز موعد مقابلتك الشفوية. توجد مواعيد متاحة، يرجى الدخول إلى فضاء المقابلة واختيار الموعد المناسب لك في أقرب وقت.",
      note: "بعد حجز الموعد، ستجد تفاصيل المقابلة ورابط Google Meet داخل فضائك.",
      button: "اختيار موعد المقابلة",
    },
    cancelled: {
      eyebrow: "تحديث بخصوص مقابلتك",
      subject: "تم إلغاء موعد مقابلتك السابق",
      title: "يرجى اختيار موعد جديد",
      body: "نحيطك علماً بأنه تم إلغاء موعد مقابلتك السابق. يرجى الدخول إلى فضاء المقابلة للاطلاع على المواعيد الجديدة واختيار الموعد الذي يناسبك.",
      note: "لن تتلقى أي تذكير بخصوص الموعد الملغى. ستبدأ التذكيرات من جديد بعد اختيار موعد جديد. نعتذر عن هذا التغيير ونشكرك على تفهّمك.",
      button: "اختيار موعد جديد",
    },
    released: {
      eyebrow: "تحديث بخصوص مقابلتك",
      subject: "تم تحديث إسناد مقابلتك",
      title: "مقابلتك في انتظار إسناد جديد",
      body: "تم إنهاء الإسناد الحالي للمسؤول عن مقابلتك. لا يلزمك اتخاذ أي إجراء الآن، وسيتم إشعارك عند إسناد مسؤول جديد إليك.",
      note: "لن تتلقى تذكيرات بالحجز إلى أن يتم إسناد مسؤول جديد وتتوفر مواعيد قابلة للحجز.",
      button: "فتح فضاء المقابلة",
    },
    reassigned: {
      eyebrow: "تحديث بخصوص مقابلتك",
      subject: "تم تحديث المسؤول عن مقابلتك",
      title: "تم تعيين مسؤول جديد لمقابلتك",
      body: "تم تحديث المسؤول عن مقابلتك الشفوية. يمكنك الدخول إلى فضاء المقابلة للاطلاع على المواعيد المتاحة واختيار الموعد الذي يناسبك.",
      note: "إذا كنت قد حجزت موعداً من قبل، ستظهر لك أحدث التفاصيل داخل فضائك.",
      button: "فتح فضاء المقابلة",
    },
    interview_transferred: {
      eyebrow: "تحديث بخصوص مقابلتك",
      subject: "تم نقل مقابلتك إلى مسؤول جديد",
      title: "تم تأكيد نقل مقابلتك",
      body: "تم نقل الإشراف على مقابلتك إلى مسؤول جديد. سيبقى تاريخ ووقت المقابلة ورابط Google Meet دون تغيير، ولا يلزمك إجراء حجز جديد.",
      note: "ستجد أدناه معلومات المسؤول الجديد عن مقابلتك. يمكنك أيضاً فتح فضاء المقابلة للاطلاع على الموعد ورابط Google Meet.",
      button: "عرض تفاصيل المقابلة",
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
                    ${type === "assigned"
                      ? messages.assigned.bodyHtml
                      : `<p style="margin:0 0 14px;font-size:17px;line-height:1.9;">${AR_HELLO} ${safeFirstName}،</p>
                         <p style="margin:0;color:#425e59;font-size:16px;line-height:2;">${message.body}</p>`}
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
    type === "assigned"
      ? "السلام عليكم ورحمة الله وبركاته،"
      : `${AR_HELLO} ${firstName || ""}،`,
    message.body,
    interviewer ? `مسؤول المقابلة: ${interviewer.name} — ${interviewer.email}${interviewer.phoneNumber ? ` — ${interviewer.phoneNumber}` : ""}` : "",
    type === "assigned"
      ? "نسأل الله لكم التوفيق، ونتطلع إلى لقائكم.\n\nلجنة إعداد أكاديمية أطر الغد\n«أقوياء لبناء الوطن، أمناء لحماية الأمة.»"
      : message.note,
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

export async function sendInterviewAdminSlotReminderEmail(input: {
  to: string;
  adminName: string;
  unbookedCount: number;
  emptySlotCount: number;
}) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping admin slot reminder email.");
    return { success: false as const, attempts: 0, reason: "SMTP_NOT_CONFIGURED" };
  }

  const adminUrl = `${PUBLIC_APP_URL}/admin/interviews`;
  const safeName = escapeEmailHtml(input.adminName || "");
  const safeAdminUrl = escapeEmailHtml(adminUrl);
  const subject = `Rappel : ajoutez des créneaux d’entretien - ${AR_ORG}`;
  const logo = getEmailLogo();
  const html = `<!doctype html>
    <html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
    <body style="margin:0;padding:0;background:#f2f7f6;font-family:Arial,sans-serif;color:#173f39;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
          <tr><td align="center" style="padding:26px;border-bottom:1px solid #e5eeec;"><img src="${logo.src}" width="190" alt="Future Leaders Foundation"></td></tr>
          <tr><td style="padding:30px 32px;">
            <h1 style="margin:0 0 20px;font-size:24px;">Des créneaux supplémentaires sont nécessaires</h1>
            <p style="font-size:16px;line-height:1.8;">Bonjour ${safeName},</p>
            <p style="font-size:16px;line-height:1.8;">Vous avez <strong>${input.unbookedCount} candidat(s) sans réservation</strong> et <strong>${input.emptySlotCount} créneau(x) futur(s) disponible(s)</strong>.</p>
            <p style="font-size:16px;line-height:1.8;">Merci d’ajouter des créneaux afin de conserver une marge suffisante pour les candidats.</p>
            <p style="text-align:center;margin:28px 0 0;"><a href="${safeAdminUrl}" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#4A9B8E;color:#fff;text-decoration:none;font-weight:bold;">Gérer les créneaux</a></p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`;
  const text = `Bonjour ${input.adminName},\n\nVous avez ${input.unbookedCount} candidat(s) sans réservation et ${input.emptySlotCount} créneau(x) futur(s) disponible(s). Merci d’ajouter des créneaux : ${adminUrl}`;

  return sendMailWithRetry({
    from: `"${AR_ORG}" <${SMTP_FROM}>`,
    to: input.to,
    subject,
    html,
    text,
    attachments: logo.attachments,
  });
}

export async function sendInterviewTransferAdminEmail(input: {
  to: string;
  recipientName: string;
  type: "request" | "accepted" | "rejected";
  candidateName: string;
  startTime: Date;
  otherAdminName: string;
  responseNote?: string | null;
}) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping interview transfer email.");
    return { success: false as const, attempts: 0, reason: "SMTP_NOT_CONFIGURED" };
  }

  const adminUrl = `${PUBLIC_APP_URL}/admin/interviews`;
  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Africa/Casablanca",
    dateStyle: "full",
    timeStyle: "short",
  }).format(input.startTime);
  const title = input.type === "request"
    ? "Nouvelle demande de transfert d’entretien"
    : input.type === "accepted"
      ? "Transfert d’entretien accepté"
      : "Transfert d’entretien refusé";
  const relationship = input.type === "request"
    ? `${input.otherAdminName} souhaite vous transférer cet entretien. En cas d’acceptation, l’horaire, le candidat et le lien Meet resteront inchangés. Les créneaux vides qui se chevauchent seront annulés automatiquement ; un entretien déjà réservé devra d’abord être libéré ou déplacé.`
    : input.type === "accepted"
      ? `${input.otherAdminName} a accepté de prendre en charge cet entretien.`
      : `${input.otherAdminName} a refusé de prendre en charge cet entretien.`;
  const logo = getEmailLogo();
  const safeName = escapeEmailHtml(input.recipientName || "");
  const safeCandidate = escapeEmailHtml(input.candidateName);
  const safeRelationship = escapeEmailHtml(relationship);
  const safeNote = input.responseNote ? escapeEmailHtml(input.responseNote) : "";
  const safeAdminUrl = escapeEmailHtml(adminUrl);
  const subject = `${title} - ${AR_ORG}`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
    <body style="margin:0;padding:0;background:#f2f7f6;font-family:Arial,sans-serif;color:#173f39;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
          <tr><td align="center" style="padding:26px;border-bottom:1px solid #e5eeec;"><img src="${logo.src}" width="190" alt="Future Leaders Foundation"></td></tr>
          <tr><td style="padding:30px 32px;"><h1 style="margin:0 0 20px;font-size:24px;">${title}</h1>
            <p style="font-size:16px;line-height:1.8;">Bonjour ${safeName},</p>
            <p style="font-size:16px;line-height:1.8;">${safeRelationship}</p>
            <p style="font-size:16px;line-height:1.8;"><strong>Candidat :</strong> ${safeCandidate}<br><strong>Horaire :</strong> ${dateLabel}</p>
            ${safeNote ? `<p style="font-size:16px;line-height:1.8;"><strong>Message :</strong> ${safeNote}</p>` : ""}
            <p style="text-align:center;margin:28px 0 0;"><a href="${safeAdminUrl}" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#4A9B8E;color:#fff;text-decoration:none;font-weight:bold;">Ouvrir les entretiens</a></p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`;
  const text = `${title}\n\nBonjour ${input.recipientName},\n\n${relationship}\nCandidat : ${input.candidateName}\nHoraire : ${dateLabel}${input.responseNote ? `\nMessage : ${input.responseNote}` : ""}\n\n${adminUrl}`;
  return sendMailWithRetry({
    from: `"${AR_ORG}" <${SMTP_FROM}>`,
    to: input.to,
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

export async function sendInterviewRebookingAuthorizedAdminEmail(input: {
  to: string;
  adminName: string;
  candidateName: string;
}) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping rebooking authorization admin notification.");
    return { success: false as const, attempts: 0, reason: "SMTP_NOT_CONFIGURED" };
  }

  const adminUrl = `${PUBLIC_APP_URL}/admin/interviews`;
  const safeAdminName = escapeEmailHtml(input.adminName || "");
  const safeCandidateName = escapeEmailHtml(input.candidateName);
  const safeAdminUrl = escapeEmailHtml(adminUrl);
  const logo = getEmailLogo();
  const subject = `Nouvelle réservation autorisée pour ${input.candidateName} - Future Leaders Foundation`;
  const html = `<!doctype html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEmailHtml(subject)}</title></head>
    <body style="margin:0;padding:0;background:#f2f7f6;font-family:Arial,sans-serif;color:#173f39;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
          <tr><td align="center" style="padding:26px;border-bottom:1px solid #e5eeec;"><img src="${logo.src}" width="190" alt="Future Leaders Foundation"></td></tr>
          <tr><td style="padding:30px 32px;">
            <h1 style="margin:0 0 20px;font-size:24px;">Nouvelle sélection de créneau autorisée</h1>
            <p style="font-size:16px;line-height:1.8;">Bonjour ${safeAdminName},</p>
            <p style="font-size:16px;line-height:1.8;">Le super-admin a autorisé <strong>${safeCandidateName}</strong> à choisir un nouveau créneau d’entretien.</p>
            <p style="font-size:16px;line-height:1.8;">Le candidat a également été informé par e-mail. Vous serez notifié lorsqu’il aura effectué sa nouvelle réservation.</p>
            <p style="text-align:center;margin:28px 0 0;"><a href="${safeAdminUrl}" style="display:inline-block;padding:14px 28px;border-radius:9px;background:#4A9B8E;color:#fff;text-decoration:none;font-weight:bold;">Ouvrir les entretiens</a></p>
          </td></tr>
        </table>
      </td></tr></table>
    </body></html>`;
  const text = `Bonjour ${input.adminName},\n\nLe super-admin a autorisé ${input.candidateName} à choisir un nouveau créneau d’entretien. Le candidat a également été informé par e-mail.\n\n${adminUrl}`;

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

export async function sendCandidateActivationInvitationEmail(input: {
  to: string;
  firstName: string;
  activationToken: string;
  expiresAt: Date;
}) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping candidate activation invitation.");
    return { success: false as const, attempts: 0, reason: "SMTP_NOT_CONFIGURED" };
  }

  const activationUrl = `${PUBLIC_APP_URL}/activate-candidate?token=${encodeURIComponent(input.activationToken)}`;
  const safeUrl = escapeEmailHtml(activationUrl);
  const safeFirstName = escapeEmailHtml(input.firstName);
  const expiryLabel = new Intl.DateTimeFormat("ar-MA", {
    timeZone: "Africa/Casablanca",
    dateStyle: "full",
    timeStyle: "short",
  }).format(input.expiresAt);
  const subject = `دعوة لتفعيل حسابكم والانتقال إلى المقابلة الشفوية - ${AR_ORG}`;
  const logo = getEmailLogo();
  const html = `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>${subject}</title>
      </head>
      <body dir="rtl" style="margin:0;padding:0;background:#f2f7f6;font-family:Tahoma,Arial,sans-serif;color:#173f39;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">فعّلوا حسابكم للانتقال إلى مرحلة المقابلة الشفوية.</div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f2f7f6;width:100%;">
          <tr><td align="center" style="padding:24px 12px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border-radius:16px;overflow:hidden;">
              <tr><td align="center" style="padding:28px 24px 20px;border-bottom:1px solid #e5eeec;">
                <img src="${logo.src}" width="190" alt="Future Leaders Foundation" style="display:block;width:190px;max-width:80%;height:auto;border:0;">
              </td></tr>
              <tr><td style="padding:32px;text-align:right;font-size:16px;line-height:2;">
                <p style="margin:0 0 18px;">السلام عليكم ورحمة الله وبركاته،</p>
                <p style="margin:0 0 18px;">مرحباً ${safeFirstName}،</p>
                <p style="margin:0 0 18px;">يسرّنا إخباركم بأنه تم ترشيحكم للانتقال إلى <strong>مرحلة المقابلة الشفوية</strong> ضمن أكاديمية أطر الغد.</p>
                <p style="margin:0 0 18px;">لإتمام قبولكم، يرجى تفعيل حسابكم واختيار كلمة مرور خاصة بكم. لن يظهر اسمكم لمسؤولي المقابلات، ولن تتمكنوا من حجز موعد، إلا بعد إتمام هذه الخطوة.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;"><tr>
                  <td bgcolor="#4A9B8E" style="border-radius:9px;">
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 30px;color:#fff;text-decoration:none;font-weight:bold;">تفعيل الحساب واختيار كلمة المرور</a>
                  </td>
                </tr></table>
                <p style="margin:0 0 8px;color:#647c77;font-size:13px;">ينتهي هذا الرابط في: ${expiryLabel} بتوقيت المغرب.</p>
                <p style="margin:0 0 8px;color:#647c77;font-size:13px;">إذا لم يعمل الزر، انسخوا الرابط التالي:</p>
                <p dir="ltr" style="margin:0;text-align:left;word-break:break-all;font-size:12px;"><a href="${safeUrl}" style="color:#4A9B8E;">${safeUrl}</a></p>
              </td></tr>
              <tr><td align="center" style="padding:20px;background:#173f39;color:#dceae7;font-size:12px;line-height:1.8;">${AR_ORG}<br>Future Leaders Foundation</td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>`;
  const text = [
    "السلام عليكم ورحمة الله وبركاته،",
    `مرحباً ${input.firstName}،`,
    "تم ترشيحكم للانتقال إلى مرحلة المقابلة الشفوية.",
    "لن يتم اعتمادكم كمرشح مقبول إلا بعد تفعيل الحساب واختيار كلمة المرور.",
    `رابط التفعيل: ${activationUrl}`,
    `ينتهي الرابط في ${expiryLabel} بتوقيت المغرب.`,
    AR_ORG,
  ].join("\n\n");

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
