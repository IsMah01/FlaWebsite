import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || "noreply@atralghad.org";
const APP_URL = process.env.APP_URL || "http://localhost:3000";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: SMTP_USER && SMTP_PASS ? {
    user: SMTP_USER,
    pass: SMTP_PASS,
  } : undefined,
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendConfirmationEmail(
  to: string,
  firstName: string,
  token: string
) {
  if (!SMTP_HOST || !SMTP_USER) {
    console.warn("[Email] SMTP not configured. Skipping email send.");
    console.log(`[Email] Confirmation link: ${APP_URL}/confirm-email?token=${token}`);
    return { success: false, reason: "SMTP_NOT_CONFIGURED" };
  }

  const confirmUrl = `${APP_URL}/confirm-email?token=${token}`;

  const html = `
    <div dir="rtl" style="font-family: 'Noto Sans Arabic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8faf9; border-radius: 12px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #4A9B8E; margin: 0;">مؤسسة أطر الغد</h1>
        <p style="color: #666; margin: 8px 0 0;">Future Leaders Foundation</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
        <h2 style="color: #2d5f56; margin-bottom: 20px;">مرحباً ${firstName}!</h2>
        <p style="color: #444; line-height: 1.8; font-size: 15px;">
          شكراً لتسجيلك في مؤسسة أطر الغد. لإكمال عملية التسجيل، يرجى النقر على الزر أدناه لتأكيد بريدك الإلكتروني.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" 
             style="display: inline-block; background: linear-gradient(135deg, #4A9B8E, #6BC4B2); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            تأكيد البريد الإلكتروني
          </a>
        </div>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 20px;">
          أو انسخ هذا الرابط والصقه في المتصفح:<br>
          <code style="direction: ltr; display: inline-block; margin-top: 8px; background: #f0f0f0; padding: 6px 12px; border-radius: 4px; font-size: 12px;">${confirmUrl}</code>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          إذا لم تقم بالتسجيل في مؤسسة أطر الغد، يمكنك تجاهل هذه الرسالة.
        </p>
      </div>
      <div style="text-align: center; padding: 20px 0; color: #aaa; font-size: 12px;">
        © 2024 مؤسسة أطر الغد. جميع الحقوق محفوظة.
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"مؤسسة أطر الغد" <${SMTP_FROM}>`,
      to,
      subject: "تأكيد بريدك الإلكتروني - مؤسسة أطر الغد",
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send confirmation email:", error);
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

  const html = `
    <div dir="rtl" style="font-family: 'Noto Sans Arabic', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8faf9; border-radius: 12px;">
      <div style="text-align: center; padding: 20px 0;">
        <h1 style="color: #4A9B8E; margin: 0;">مؤسسة أطر الغد</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 12px; margin-top: 20px;">
        ${content}
      </div>
      <div style="text-align: center; padding: 20px 0; color: #aaa; font-size: 12px;">
        <a href="${APP_URL}/unsubscribe?email=${encodeURIComponent(to)}" style="color: #4A9B8E;">إلغاء الاشتراك</a>
        <br><br>
        © 2024 مؤسسة أطر الغد
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"مؤسسة أطر الغد" <${SMTP_FROM}>`,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("[Email] Failed to send newsletter:", error);
    return { success: false, reason: "SEND_FAILED" };
  }
}
