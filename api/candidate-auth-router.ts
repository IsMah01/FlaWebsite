import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { candidates, newUsers } from "@db/schema";
import { sendConfirmationEmail, sendPasswordResetEmail } from "./lib/email";
import { upsertUser } from "./queries/users";

const JWT_SECRET = process.env.APP_SECRET;

if (!JWT_SECRET) {
  throw new Error("APP_SECRET is required");
}

function readCandidateToken(cookieHeader: string) {
  return cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("candidate_token="))
    ?.split("=")[1];
}

function secureCookieSuffix() {
  return process.env.APP_URL?.startsWith("https://") ? "; Secure" : "";
}

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
}

function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function requireCandidateSession(cookieHeader: string) {
  const token = readCandidateToken(cookieHeader);
  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "ÙŠØ¬Ø¨ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø£ÙˆÙ„Ø§.",
    });
  }

  try {
    return jwt.verify(token, JWT_SECRET) as { newUserId: number; email: string };
  } catch {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Ø¬Ù„Ø³Ø© ØºÙŠØ± ØµØ§Ù„Ø­Ø©.",
    });
  }
}

const newUserBaseSelection = {
  id: newUsers.id,
  firstName: newUsers.firstName,
  lastName: newUsers.lastName,
  studyStatus: newUsers.studyStatus,
  attestationUrl: newUsers.attestationUrl,
  phoneNumber: newUsers.phoneNumber,
  email: newUsers.email,
  isAmbassador: newUsers.isAmbassador,
  password: newUsers.password,
  emailConfirmed: newUsers.emailConfirmed,
  confirmationToken: newUsers.confirmationToken,
  newsletterConsent: newUsers.newsletterConsent,
  createdAt: newUsers.createdAt,
  updatedAt: newUsers.updatedAt,
  lastLoginAt: newUsers.lastLoginAt,
};

export const candidateAuthRouter = createRouter({
  register: publicQuery
    .input(
      z
        .object({
          firstName: z.string().min(1, "الاسم مطلوب"),
          lastName: z.string().min(1, "اسم العائلة مطلوب"),
          studyStatus: z.enum(["student", "graduated", "master_student", "phd_student", "other"]),
          attestationUrl: z
            .string()
            .regex(/^private:\/\/(attestation)-[a-f0-9-]+\.(pdf|jpg|jpeg|png)$/i)
            .optional(),
          phoneNumber: z.string().min(1, "رقم الهاتف مطلوب"),
          email: z.string().email("بريد إلكتروني غير صالح"),
          isAmbassador: z.boolean().default(false),
          password: z.string().min(6, "كلمة المرور يجب أن تتكون من 6 أحرف على الأقل"),
          confirmPassword: z.string(),
          newsletterConsent: z.boolean().default(false),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "كلمتا المرور غير متطابقتين",
          path: ["confirmPassword"],
        }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const normalizedEmail = input.email.trim().toLowerCase();

      const existing = await db
        .select({ id: newUsers.id })
        .from(newUsers)
        .where(eq(newUsers.email, normalizedEmail))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "هذا البريد الإلكتروني مسجل بالفعل",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);
      const confirmationToken = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: "24h" });

      const [newUser] = await db.insert(newUsers).values({
        firstName: input.firstName,
        lastName: input.lastName,
        studyStatus: input.studyStatus,
        attestationUrl: input.attestationUrl || null,
        phoneNumber: input.phoneNumber,
        email: normalizedEmail,
        isAmbassador: input.isAmbassador,
        password: hashedPassword,
        emailConfirmed: false,
        confirmationToken,
        newsletterConsent: input.newsletterConsent,
      });

      const emailResult = await sendConfirmationEmail(normalizedEmail, input.firstName, confirmationToken);
      const confirmationUrl = `${process.env.APP_URL || "http://localhost:3000"}/confirm-email?token=${confirmationToken}`;

      return {
        success: true,
        newUserId: newUser.insertId,
        emailSent: emailResult.success,
        confirmationUrl,
        message: emailResult.success
          ? "تم التسجيل بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد حسابك."
          : "تم التسجيل بنجاح! (لم يتم إرسال البريد - يرجى التحقق من إعدادات SMTP)",
      };
    }),

  confirmEmail: publicQuery
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      try {
        const decoded = jwt.verify(input.token, JWT_SECRET) as { email: string };
        const account = await db
          .select({ id: newUsers.id })
          .from(newUsers)
          .where(eq(newUsers.email, decoded.email))
          .limit(1);

        if (account.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المستخدم غير موجود",
          });
        }

        await db.update(newUsers).set({ emailConfirmed: true, confirmationToken: null }).where(eq(newUsers.email, decoded.email));

        return { success: true, message: "تم تأكيد البريد الإلكتروني بنجاح" };
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رابط التأكيد غير صالح أو منتهي الصلاحية",
        });
      }
    }),

  resendConfirmation: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const normalizedEmail = input.email.trim().toLowerCase();
      const [account] = await db
        .select({
          id: newUsers.id,
          firstName: newUsers.firstName,
          emailConfirmed: newUsers.emailConfirmed,
        })
        .from(newUsers)
        .where(eq(newUsers.email, normalizedEmail))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "المستخدم غير موجود",
        });
      }

      if (account.emailConfirmed) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "البريد الإلكتروني مؤكد بالفعل",
        });
      }

      const confirmationToken = jwt.sign({ email: normalizedEmail }, JWT_SECRET, { expiresIn: "24h" });

      await db.update(newUsers).set({ confirmationToken }).where(eq(newUsers.email, normalizedEmail));

      const emailResult = await sendConfirmationEmail(normalizedEmail, account.firstName, confirmationToken);

      return {
        success: true,
        emailSent: emailResult.success,
        message: emailResult.success
          ? "تم إرسال رابط التأكيد الجديد إلى بريدك الإلكتروني"
          : "تم إنشاء رابط التأكيد (تعذر إرسال البريد - تحقق من SMTP)",
      };
    }),

  requestPasswordReset: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const normalizedEmail = input.email.trim().toLowerCase();
      const [account] = await db
        .select({
          id: newUsers.id,
          firstName: newUsers.firstName,
          email: newUsers.email,
        })
        .from(newUsers)
        .where(eq(newUsers.email, normalizedEmail))
        .limit(1);

      if (!account) {
        return { success: true, emailSent: false };
      }

      const reset = createPasswordResetToken();
      await db
        .update(newUsers)
        .set({
          passwordResetToken: reset.tokenHash,
          passwordResetExpiresAt: reset.expiresAt,
        })
        .where(eq(newUsers.id, account.id));

      await db
        .update(candidates)
        .set({
          passwordResetToken: reset.tokenHash,
          passwordResetExpiresAt: reset.expiresAt,
        })
        .where(eq(candidates.newUserId, account.id));

      const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/reset-password?token=${reset.token}`;
      const emailResult = await sendPasswordResetEmail(account.email, account.firstName, resetUrl);

      return { success: true, emailSent: emailResult.success };
    }),

  resetPassword: publicQuery
    .input(
      z
        .object({
          token: z.string().min(20),
          password: z.string().min(6, "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ÙŠØ¬Ø¨ Ø£Ù† ØªØªÙƒÙˆÙ† Ù…Ù† 6 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„"),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "ÙƒÙ„Ù…ØªØ§ Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚ØªÙŠÙ†",
          path: ["confirmPassword"],
        }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const tokenHash = hashPasswordResetToken(input.token);
      const [account] = await db
        .select({
          id: newUsers.id,
          passwordResetExpiresAt: newUsers.passwordResetExpiresAt,
        })
        .from(newUsers)
        .where(eq(newUsers.passwordResetToken, tokenHash))
        .limit(1);

      if (!account || !account.passwordResetExpiresAt || account.passwordResetExpiresAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ø±Ø§Ø¨Ø· Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ§Ù„Ø­ Ø£Ùˆ Ù…Ù†ØªÙ‡ÙŠ Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ©",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);
      await db
        .update(newUsers)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        })
        .where(eq(newUsers.id, account.id));

      await db
        .update(candidates)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        })
        .where(eq(candidates.newUserId, account.id));

      return { success: true };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const normalizedEmail = input.email.trim().toLowerCase();
      const [account] = await db
        .select(newUserBaseSelection)
        .from(newUsers)
        .where(eq(newUsers.email, normalizedEmail))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        });
      }

      const [candidateRecord] = await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(eq(candidates.newUserId, account.id))
        .limit(1);

      const valid = await bcrypt.compare(input.password, account.password);
      if (!valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        });
      }

      if (!account.emailConfirmed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "يرجى تأكيد بريدك الإلكتروني أولا",
        });
      }

      const token = jwt.sign({ newUserId: account.id, email: account.email }, JWT_SECRET, { expiresIn: "7d" });
      const secure = secureCookieSuffix();

      ctx.resHeaders.append(
        "set-cookie",
        `candidate_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secure}`,
      );

      await db.update(newUsers).set({ lastLoginAt: new Date() }).where(eq(newUsers.id, account.id));

      await upsertUser({
        unionId: `newuser:${account.id}`,
        name: `${account.firstName} ${account.lastName}`.trim(),
        email: account.email,
        role: "user",
        status: account.isAmbassador ? "ambassador" : candidateRecord ? "candidate" : "user",
        lastSignInAt: new Date(),
        date: new Date(),
      });

      return {
        success: true,
        candidate: {
          id: account.id,
          firstName: account.firstName,
          lastName: account.lastName,
          email: account.email,
          isAmbassador: account.isAmbassador,
        },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const token = readCandidateToken(ctx.req.headers.get("cookie") || "");
    if (!token) return null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        newUserId: number;
        email: string;
      };
      const db = getDb();
      const [account] = await db
        .select({
          id: newUsers.id,
          firstName: newUsers.firstName,
          lastName: newUsers.lastName,
          email: newUsers.email,
          isAmbassador: newUsers.isAmbassador,
          studyStatus: newUsers.studyStatus,
        })
        .from(newUsers)
        .where(eq(newUsers.id, decoded.newUserId))
        .limit(1);
      const [candidateRecord] = await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(eq(candidates.newUserId, decoded.newUserId))
        .limit(1);

      if (!account) return null;

      return {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        isAmbassador: account.isAmbassador,
        studyStatus: account.studyStatus,
        hasSubmittedQuestionnaire: !!candidateRecord,
      };
    } catch {
      return null;
    }
  }),

  getQuestionnaireDraft: publicQuery.query(async ({ ctx }) => {
    const decoded = requireCandidateSession(ctx.req.headers.get("cookie") || "");
    const db = getDb();
    const [account] = await db
      .select({ questionnaireDraft: newUsers.questionnaireDraft })
      .from(newUsers)
      .where(eq(newUsers.id, decoded.newUserId))
      .limit(1);

    if (!account) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Ø§Ù„Ø­Ø³Ø§Ø¨ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯.",
      });
    }

    return { draft: account.questionnaireDraft };
  }),

  saveQuestionnaireDraft: publicQuery
    .input(
      z.object({
        draft: z.string().max(65000),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const decoded = requireCandidateSession(ctx.req.headers.get("cookie") || "");
      const db = getDb();
      await db
        .update(newUsers)
        .set({ questionnaireDraft: input.draft })
        .where(eq(newUsers.id, decoded.newUserId));

      return { success: true };
    }),

  submitQuestionnaire: publicQuery
    .input(
      z.object({
        answers: z.record(z.string(), z.string()),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const token = readCandidateToken(ctx.req.headers.get("cookie") || "");
      if (!token) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "يجب تسجيل الدخول أولا.",
        });
      }

      let decoded: { newUserId: number; email: string };
      try {
        decoded = jwt.verify(token, JWT_SECRET) as { newUserId: number; email: string };
      } catch {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "جلسة غير صالحة.",
        });
      }

      const db = getDb();
      const [account] = await db
        .select(newUserBaseSelection)
        .from(newUsers)
        .where(eq(newUsers.id, decoded.newUserId))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "الحساب غير موجود.",
        });
      }

      await db
        .insert(candidates)
        .values({
          newUserId: account.id,
          firstName: account.firstName,
          lastName: account.lastName,
          studyStatus: account.studyStatus,
          attestationUrl: account.attestationUrl,
          idCardUrl: null,
          phoneNumber: account.phoneNumber,
          email: account.email,
          isAmbassador: account.isAmbassador,
          password: account.password,
          emailConfirmed: account.emailConfirmed,
          confirmationToken: account.confirmationToken,
          newsletterConsent: account.newsletterConsent,
          questionnaireAnswers: JSON.stringify(input.answers),
          submittedAt: new Date(),
        })
        .onDuplicateKeyUpdate({
          set: {
            firstName: account.firstName,
            lastName: account.lastName,
            studyStatus: account.studyStatus,
            attestationUrl: account.attestationUrl,
            phoneNumber: account.phoneNumber,
            email: account.email,
            isAmbassador: account.isAmbassador,
            password: account.password,
            emailConfirmed: account.emailConfirmed,
            confirmationToken: account.confirmationToken,
            newsletterConsent: account.newsletterConsent,
            questionnaireAnswers: JSON.stringify(input.answers),
            submittedAt: new Date(),
          },
        });

      await db
        .update(newUsers)
        .set({ questionnaireDraft: null })
        .where(eq(newUsers.id, account.id));

      return { success: true, message: "تم حفظ الاستمارة بنجاح." };
    }),

  logout: publicQuery.mutation(async ({ ctx }) => {
    ctx.resHeaders.append("set-cookie", "candidate_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
    return { success: true };
  }),
});
