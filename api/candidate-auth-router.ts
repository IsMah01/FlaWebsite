import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb, getSqlPool } from "./queries/connection";
import { candidateInvitations, candidates, newUsers } from "@db/schema";
import { sendConfirmationEmail, sendPasswordResetEmail } from "./lib/email";
import { upsertUser } from "./queries/users";
import { getClientIp, rateLimitOrThrow, securityLog } from "./lib/abuse-protection";
import { secureCookieSuffix } from "./lib/cookie-security";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const FINAL_PROFILE_DIR = path.resolve(process.cwd(), "storage", "private", "uploads", "final-profiles");
const DAILY_TASKS = {
  fajr_prayer: "صلاة الصبح",
  morning_adhkar: "أذكار الصباح",
  quran_wird: "الورد القرآني",
  evening_adhkar: "أذكار المساء",
  sleep_adhkar: "أذكار النوم",
} as const;

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

function buildCandidateCookie(token: string) {
  return `candidate_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax${secureCookieSuffix()}`;
}

export function createCandidateSessionCookie(newUserId: number, email: string) {
  const token = jwt.sign({ newUserId, email }, JWT_SECRET, { expiresIn: "7d" });
  return buildCandidateCookie(token);
}

function clearCandidateCookie() {
  return `candidate_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secureCookieSuffix()}`;
}

function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
}

function createConfirmationToken(email: string) {
  const token = jwt.sign(
    { email, nonce: crypto.randomBytes(16).toString("hex") },
    JWT_SECRET,
    { expiresIn: "24h" },
  );

  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
  };
}

function hashConfirmationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function enforceAuthRateLimit(options: {
  action:
    | "candidate_register"
    | "confirmation_resend"
    | "password_reset"
    | "candidate_login";
  req: Request;
  email: string;
  limit: number;
  ipLimit?: number;
  windowMs: number;
  message: string;
}) {
  const ip = getClientIp(options.req);
  const email = options.email.trim().toLowerCase();
  await rateLimitOrThrow({
    key: `${options.action}:ip:${ip}`,
    limit: options.ipLimit ?? options.limit,
    windowMs: options.windowMs,
    message: options.message,
  });
  await rateLimitOrThrow({
    key: `${options.action}:email:${email}`,
    limit: options.limit,
    windowMs: options.windowMs,
    message: options.message,
  });
  return { ip, email };
}

const passwordPolicyMessage = "يجب أن تتكون كلمة المرور من 8 أحرف على الأقل وأن تحتوي على حرف كبير واحد على الأقل.";
const strongPasswordSchema = z.string()
  .min(8, passwordPolicyMessage)
  .max(128, passwordPolicyMessage)
  .regex(/[A-Z]/, passwordPolicyMessage);

export function requireCandidateSession(cookieHeader: string) {
  const token = readCandidateToken(cookieHeader);
  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "يجب تسجيل الدخول أولا.",
    });
  }

  try {
    return jwt.verify(token, JWT_SECRET) as { newUserId: number; email: string };
  } catch {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "جلسة غير صالحة.",
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
  finalConfirmationAccount: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      await enforceAuthRateLimit({
        action: "candidate_login",
        req: ctx.req,
        email: normalizedEmail,
        limit: 10,
        ipLimit: 30,
        windowMs: 60 * 1000,
        message: "Trop de vérifications. Veuillez réessayer dans une minute.",
      });
      const [rows] = await getSqlPool().query<any[]>(
        `SELECT emailConfirmed FROM new_users WHERE email = ? LIMIT 1`,
        [normalizedEmail],
      );
      return { accountExists: Boolean(rows[0]), emailConfirmed: Boolean(rows[0]?.emailConfirmed) };
    }),

  confirmExistingFinalCandidate: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string().min(1).max(128) }))
    .mutation(async ({ input, ctx }) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      const { ip } = await enforceAuthRateLimit({
        action: "candidate_login",
        req: ctx.req,
        email: normalizedEmail,
        limit: 5,
        windowMs: 60 * 1000,
        message: "Trop de tentatives de connexion.",
      });
      const [rows] = await getSqlPool().query<any[]>(
        `SELECT id, firstName, lastName, phoneNumber, password, emailConfirmed
         FROM new_users WHERE email = ? LIMIT 1`,
        [normalizedEmail],
      );
      const account = rows[0];
      if (!account || !(await bcrypt.compare(input.password, account.password))) {
        await securityLog("final_confirmation_bad_password", { ip, email: normalizedEmail });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Adresse e-mail ou mot de passe incorrect." });
      }
      const [existingFinalRows] = await getSqlPool().query<any[]>(
        `SELECT status FROM final_candidate_confirmations WHERE email = ? LIMIT 1`,
        [normalizedEmail],
      );
      if (existingFinalRows[0]?.status === "removed") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Votre participation a été retirée de la liste finale. Veuillez contacter l’administration." });
      }
      if (!account.emailConfirmed) {
        const confirmation = createConfirmationToken(normalizedEmail);
        await getSqlPool().execute(`UPDATE new_users SET confirmationToken = ? WHERE id = ?`, [confirmation.tokenHash, account.id]);
        await getSqlPool().execute(
          `INSERT INTO final_candidate_confirmations
             (email, newUserId, firstName, lastName, phoneNumber, status)
           VALUES (?, ?, ?, ?, ?, 'pending_email')
           ON DUPLICATE KEY UPDATE newUserId = VALUES(newUserId), firstName = VALUES(firstName),
             lastName = VALUES(lastName), phoneNumber = VALUES(phoneNumber), status = 'pending_email',
             confirmedAt = NULL, removedAt = NULL, removedByAdminId = NULL`,
          [normalizedEmail, account.id, account.firstName, account.lastName, account.phoneNumber || ""],
        );
        const emailResult = await sendConfirmationEmail(normalizedEmail, account.firstName, confirmation.token);
        return { success: true, needsEmailConfirmation: true, emailSent: emailResult.success };
      }
      await getSqlPool().execute(
        `INSERT INTO final_candidate_confirmations
           (email, newUserId, firstName, lastName, phoneNumber, status, confirmedAt)
         VALUES (?, ?, ?, ?, ?, 'confirmed', CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE newUserId = VALUES(newUserId), firstName = VALUES(firstName),
           lastName = VALUES(lastName), phoneNumber = VALUES(phoneNumber), status = 'confirmed',
           confirmedAt = CURRENT_TIMESTAMP, removedAt = NULL, removedByAdminId = NULL`,
        [normalizedEmail, account.id, account.firstName, account.lastName, account.phoneNumber || ""],
      );
      const token = jwt.sign({ newUserId: account.id, email: normalizedEmail }, JWT_SECRET, { expiresIn: "7d" });
      ctx.resHeaders.append("set-cookie", buildCandidateCookie(token));
      return { success: true, needsEmailConfirmation: false, emailSent: false };
    }),

  finalProgrammeAccess: publicQuery.query(async ({ ctx }) => {
    const session = requireCandidateSession(ctx.req.headers.get("cookie") || "");
    const [rows] = await getSqlPool().query<any[]>(
      `SELECT firstName, lastName, email, confirmedAt, profileImageFile, profileDescription
       FROM final_candidate_confirmations
       WHERE newUserId = ? AND email = ? AND status = 'confirmed'
       LIMIT 1`,
      [session.newUserId, session.email.trim().toLowerCase()],
    );
    if (!rows[0]) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Cette page est réservée aux candidats confirmés définitivement." });
    }
    return {
      ...rows[0],
      profileImageUrl: rows[0].profileImageFile ? `/api/final-candidate/profile-image/${rows[0].profileImageFile}` : null,
    };
  }),

  dailyTasks: publicQuery.query(async ({ ctx }) => {
    const session = requireCandidateSession(ctx.req.headers.get("cookie") || "");
    const [candidates] = await getSqlPool().query<any[]>(`SELECT id FROM final_candidate_confirmations WHERE newUserId=? AND status='confirmed' LIMIT 1`, [session.newUserId]);
    if (!candidates[0]) throw new TRPCError({ code: "FORBIDDEN", message: "هذه المهام مخصصة للمشاركين المؤكدين نهائياً." });
    const [dayRows] = await getSqlPool().query<any[]>(`SELECT DATEDIFF(DATE(DATE_SUB(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+01:00'),INTERVAL 1 HOUR)),'2026-08-14')+1 currentDay, TIME_FORMAT(TIME(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+01:00')),'%H:%i') currentTime`);
    const currentDay = Number(dayRows[0].currentDay);
    const currentTime = String(dayRows[0].currentTime);
    const [rows] = await getSqlPool().query<any[]>(`SELECT dayNumber,taskKey,completedAt FROM candidate_daily_tasks WHERE finalCandidateId=? ORDER BY dayNumber,completedAt`, [candidates[0].id]);
    const [dailyForms] = await getSqlPool().query<any[]>(
      `SELECT f.formKey,f.title,f.formUrl,f.publishedAt,
              DATE_ADD(f.publishedAt,INTERVAL 24 HOUR) fullPointsDeadline
       FROM candidate_daily_forms f
       LEFT JOIN candidate_daily_form_submissions s
         ON s.formKey=f.formKey AND s.finalCandidateId=?
       WHERE f.isActive=true AND s.id IS NULL
       ORDER BY f.publishedAt,f.id`,
      [candidates[0].id],
    );
    return { currentDay, currentTime, editionActive: currentDay >= 1 && currentDay <= 10, tasks: Object.entries(DAILY_TASKS).map(([key,label]) => ({ key, label, available: key !== "fajr_prayer" || (currentTime >= "05:15" && currentTime <= "06:45") })), completions: rows.map((row) => ({ dayNumber: Number(row.dayNumber), taskKey: String(row.taskKey), completedAt: row.completedAt })), dailyForms: dailyForms.map((form) => ({ formKey: String(form.formKey), title: String(form.title), formUrl: String(form.formUrl), publishedAt: form.publishedAt, fullPointsDeadline: form.fullPointsDeadline })) };
  }),

  setDailyTask: publicQuery.input(z.object({ dayNumber: z.number().int().min(1).max(10), taskKey: z.enum(["fajr_prayer","morning_adhkar","quran_wird","evening_adhkar","sleep_adhkar"]), completed: z.boolean() })).mutation(async ({ input, ctx }) => {
    const session = requireCandidateSession(ctx.req.headers.get("cookie") || "");
    const connection = await getSqlPool().getConnection();
    try {
      await connection.beginTransaction();
      const [candidates] = await connection.query<any[]>(`SELECT id FROM final_candidate_confirmations WHERE newUserId=? AND email=? AND status='confirmed' LIMIT 1 FOR UPDATE`, [session.newUserId, session.email.trim().toLowerCase()]);
      if (!candidates[0]) throw new TRPCError({ code: "FORBIDDEN", message: "هذه المهام مخصصة للمشاركين المؤكدين نهائياً." });
      const [dayRows] = await connection.query<any[]>(`SELECT DATEDIFF(DATE(DATE_SUB(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+01:00'),INTERVAL 1 HOUR)),'2026-08-14')+1 currentDay, TIME_FORMAT(TIME(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','+01:00')),'%H:%i') currentTime`);
      if (Number(dayRows[0].currentDay) !== input.dayNumber) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "يمكن تسجيل مهام اليوم الحالي فقط." });
      const currentTime = String(dayRows[0].currentTime);
      if (input.taskKey === "fajr_prayer" && (currentTime < "05:15" || currentTime > "06:45")) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "يمكن تسجيل صلاة الصبح فقط بين 05:15 و06:45 بتوقيت المغرب." });
      const sourceKey = `daily-task:${input.dayNumber}:${input.taskKey}`;
      if (input.completed) {
        await connection.execute(`INSERT IGNORE INTO candidate_daily_tasks (finalCandidateId,dayNumber,taskKey) VALUES (?,?,?)`, [candidates[0].id,input.dayNumber,input.taskKey]);
        await connection.execute(`INSERT INTO candidate_point_entries (finalCandidateId,sourceKey,actionType,points,title,detail) VALUES (?,?,'daily_task',1,?,'إتمام مهمة اليوم') ON DUPLICATE KEY UPDATE title=VALUES(title),detail=VALUES(detail)`, [candidates[0].id,sourceKey,DAILY_TASKS[input.taskKey]]);
      } else {
        await connection.execute(`DELETE FROM candidate_daily_tasks WHERE finalCandidateId=? AND dayNumber=? AND taskKey=?`, [candidates[0].id,input.dayNumber,input.taskKey]);
        await connection.execute(`DELETE FROM candidate_point_entries WHERE finalCandidateId=? AND sourceKey=?`, [candidates[0].id,sourceKey]);
      }
      await connection.commit();
      return { success: true };
    } catch (error) { try { await connection.rollback(); } catch { /* ignored */ } throw error; } finally { connection.release(); }
  }),

  updateFinalCandidateProfile: publicQuery
    .input(z.object({
      description: z.string().trim().max(500),
      image: z.object({ mimeType: z.enum(["image/jpeg", "image/png"]), data: z.string().min(1) }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const session = requireCandidateSession(ctx.req.headers.get("cookie") || "");
      const [rows] = await getSqlPool().query<any[]>(
        `SELECT id, profileImageFile FROM final_candidate_confirmations
         WHERE newUserId = ? AND email = ? AND status = 'confirmed' LIMIT 1`,
        [session.newUserId, session.email.trim().toLowerCase()],
      );
      const profile = rows[0];
      if (!profile) throw new TRPCError({ code: "FORBIDDEN", message: "هذه الصفحة مخصصة للمشاركين المؤكدين نهائياً." });
      await rateLimitOrThrow({ key: `final-profile:${session.newUserId}`, limit: 10, windowMs: 60 * 60 * 1000, message: "تم إجراء تعديلات كثيرة. يرجى المحاولة لاحقاً." });

      let nextImageFile: string | null = profile.profileImageFile || null;
      if (input.image) {
        const buffer = Buffer.from(input.image.data, "base64");
        if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "يجب ألا يتجاوز حجم الصورة 2 ميغابايت." });
        const isJpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
        const isPng = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
        if ((input.image.mimeType === "image/jpeg" && !isJpeg) || (input.image.mimeType === "image/png" && !isPng)) throw new TRPCError({ code: "BAD_REQUEST", message: "الصورة غير صالحة. استعملوا ملف JPG أو PNG." });
        await mkdir(FINAL_PROFILE_DIR, { recursive: true, mode: 0o700 });
        nextImageFile = `profile-${session.newUserId}-${crypto.randomUUID()}${input.image.mimeType === "image/png" ? ".png" : ".jpg"}`;
        await writeFile(path.join(FINAL_PROFILE_DIR, nextImageFile), buffer, { mode: 0o600 });
      }

      await getSqlPool().execute(
        `UPDATE final_candidate_confirmations SET profileDescription = ?, profileImageFile = ? WHERE id = ?`,
        [input.description || null, nextImageFile, profile.id],
      );
      if (input.image && profile.profileImageFile && profile.profileImageFile !== nextImageFile) {
        await unlink(path.join(FINAL_PROFILE_DIR, profile.profileImageFile)).catch(() => undefined);
      }
      return { success: true, profileImageUrl: nextImageFile ? `/api/final-candidate/profile-image/${nextImageFile}` : null };
    }),

  registerFinalCandidate: publicQuery
    .input(z.object({
      email: z.string().email(),
      firstName: z.string().trim().min(1).max(255),
      lastName: z.string().trim().min(1).max(255),
      phoneNumber: z.string().trim().min(1).max(50),
      password: strongPasswordSchema,
      confirmPassword: z.string(),
    }).refine((value) => value.password === value.confirmPassword, {
      message: "Les mots de passe ne correspondent pas.", path: ["confirmPassword"],
    }))
    .mutation(async ({ input, ctx }) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      await enforceAuthRateLimit({
        action: "candidate_register", req: ctx.req, email: normalizedEmail,
        limit: 5, ipLimit: 25, windowMs: 3 * 60 * 1000,
        message: "Trop de créations de compte ont été demandées.",
      });
      const connection = await getSqlPool().getConnection();
      try {
        await connection.beginTransaction();
        const [removedFinalRows] = await connection.query<any[]>(`SELECT status FROM final_candidate_confirmations WHERE email = ? LIMIT 1 FOR UPDATE`, [normalizedEmail]);
        if (removedFinalRows[0]?.status === "removed") throw new TRPCError({ code: "FORBIDDEN", message: "Votre participation a été retirée de la liste finale. Veuillez contacter l’administration." });
        const [existing] = await connection.query<any[]>(`SELECT id FROM new_users WHERE email = ? LIMIT 1`, [normalizedEmail]);
        if (existing[0]) throw new TRPCError({ code: "CONFLICT", message: "Un compte existe déjà avec cette adresse." });
        const passwordHash = await bcrypt.hash(input.password, 12);
        const confirmation = createConfirmationToken(normalizedEmail);
        const [result] = await connection.execute<any>(
          `INSERT INTO new_users
             (firstName, lastName, studyStatus, phoneNumber, email, password, emailConfirmed, confirmationToken, newsletterConsent)
           VALUES (?, ?, 'other', ?, ?, ?, false, ?, false)`,
          [input.firstName, input.lastName, input.phoneNumber, normalizedEmail, passwordHash, confirmation.tokenHash],
        );
        await connection.execute(
          `INSERT INTO final_candidate_confirmations
             (email, newUserId, firstName, lastName, phoneNumber, status)
           VALUES (?, ?, ?, ?, ?, 'pending_email')
           ON DUPLICATE KEY UPDATE newUserId = VALUES(newUserId), firstName = VALUES(firstName),
             lastName = VALUES(lastName), phoneNumber = VALUES(phoneNumber), status = 'pending_email',
             confirmedAt = NULL, removedAt = NULL, removedByAdminId = NULL`,
          [normalizedEmail, result.insertId, input.firstName, input.lastName, input.phoneNumber],
        );
        await connection.commit();
        const emailResult = await sendConfirmationEmail(normalizedEmail, input.firstName, confirmation.token);
        return { success: true, emailSent: emailResult.success };
      } catch (error) {
        await connection.rollback().catch(() => null);
        throw error;
      } finally {
        connection.release();
      }
    }),

  candidateInvitation: publicQuery
    .input(z.object({ token: z.string().min(32).max(256) }))
    .query(async ({ input }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
      const [rows] = await getSqlPool().query<any[]>(
        `SELECT firstName, lastName, email, status, expiresAt
         FROM candidate_invitations
         WHERE tokenHash = ?
         LIMIT 1`,
        [tokenHash],
      );
      const invitation = rows[0];
      if (!invitation || invitation.status !== "pending") {
        throw new TRPCError({ code: "NOT_FOUND", message: "رابط التفعيل غير صالح أو تم استعماله من قبل." });
      }
      if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "انتهت صلاحية رابط التفعيل. يرجى طلب إعادة إرسال الدعوة." });
      }
      return {
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      };
    }),

  activateCandidateInvitation: publicQuery
    .input(z.object({
      token: z.string().min(32).max(256),
      password: strongPasswordSchema,
      confirmPassword: z.string(),
    }).refine((value) => value.password === value.confirmPassword, {
      message: "كلمتا المرور غير متطابقتين.",
      path: ["confirmPassword"],
    }))
    .mutation(async ({ input }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
      const connection = await getSqlPool().getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.query<any[]>(
          `SELECT id, firstName, lastName, email, phoneNumber, status, expiresAt
           FROM candidate_invitations
           WHERE tokenHash = ?
           LIMIT 1 FOR UPDATE`,
          [tokenHash],
        );
        const invitation = rows[0];
        if (!invitation || invitation.status !== "pending") {
          throw new TRPCError({ code: "NOT_FOUND", message: "رابط التفعيل غير صالح أو تم استعماله من قبل." });
        }
        if (new Date(invitation.expiresAt).getTime() <= Date.now()) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "انتهت صلاحية رابط التفعيل. يرجى التواصل مع الإدارة." });
        }
        const [existing] = await connection.query<any[]>(
          `SELECT
             (SELECT id FROM new_users WHERE email = ? LIMIT 1) AS accountId,
             (SELECT id FROM candidates WHERE email = ? LIMIT 1) AS candidateId`,
          [invitation.email, invitation.email],
        );
        if (existing[0]?.accountId || existing[0]?.candidateId) {
          throw new TRPCError({ code: "CONFLICT", message: "يوجد حساب مسجل مسبقاً بهذا البريد الإلكتروني." });
        }

        const passwordHash = await bcrypt.hash(input.password, 12);
        const [accountResult] = await connection.execute<any>(
          `INSERT INTO new_users
             (firstName, lastName, studyStatus, phoneNumber, email, password,
              emailConfirmed, newsletterConsent)
           VALUES (?, ?, 'other', ?, ?, ?, true, false)`,
          [
            invitation.firstName,
            invitation.lastName,
            invitation.phoneNumber || "",
            invitation.email,
            passwordHash,
          ],
        );
        await connection.execute(
          `INSERT INTO candidates
             (newUserId, firstName, lastName, studyStatus, phoneNumber, email,
              password, emailConfirmed, newsletterConsent, applicationStatus,
              questionnaireAnswers, adminNote)
           VALUES (?, ?, ?, 'other', ?, ?, ?, true, false, 'accepted', ?, ?)`,
          [
            accountResult.insertId,
            invitation.firstName,
            invitation.lastName,
            invitation.phoneNumber || "",
            invitation.email,
            passwordHash,
            JSON.stringify([]),
            "Candidat accepté après activation d’une invitation importée.",
          ],
        );
        await connection.execute(
          `UPDATE candidate_invitations
           SET status = 'activated', activatedAt = CURRENT_TIMESTAMP, tokenHash = ?
           WHERE id = ?`,
          [crypto.randomBytes(32).toString("hex"), invitation.id],
        );
        await connection.commit();
        return {
          success: true,
          email: invitation.email,
          message: "تم تفعيل حسابكم وقبولكم بنجاح. يمكنكم الآن تسجيل الدخول.",
        };
      } catch (error) {
        await connection.rollback().catch(() => null);
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
          throw new TRPCError({ code: "CONFLICT", message: "يوجد حساب مسجل مسبقاً بهذا البريد الإلكتروني." });
        }
        throw error;
      } finally {
        connection.release();
      }
    }),

  register: publicQuery
    .input(
      z
        .object({
          firstName: z.string().min(1, "الاسم مطلوب"),
          lastName: z.string().min(1, "اسم العائلة مطلوب"),
          studyStatus: z.enum(["student", "graduated", "master_student", "phd_student", "other"]),
          phoneNumber: z.string().min(1, "رقم الهاتف مطلوب"),
          email: z.string().email("بريد إلكتروني غير صالح"),
          password: strongPasswordSchema,
          confirmPassword: z.string(),
          newsletterConsent: z.boolean().default(false),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "كلمتا المرور غير متطابقتين",
          path: ["confirmPassword"],
        }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const normalizedEmail = input.email.trim().toLowerCase();
      await enforceAuthRateLimit({
        action: "candidate_register",
        req: ctx.req,
        email: normalizedEmail,
        limit: 5,
        ipLimit: 25,
        windowMs: 3 * 60 * 1000,
        message: "Trop de créations de compte ont été demandées avec cette adresse email ou cette connexion.",
      });

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
      const confirmation = createConfirmationToken(normalizedEmail);

      const [newUser] = await db.insert(newUsers).values({
        firstName: input.firstName,
        lastName: input.lastName,
        studyStatus: input.studyStatus,
        attestationUrl: null,
        phoneNumber: input.phoneNumber,
        email: normalizedEmail,
        // Privileged flags must never come from a public registration request.
        isAmbassador: false,
        password: hashedPassword,
        emailConfirmed: false,
        confirmationToken: confirmation.tokenHash,
        newsletterConsent: input.newsletterConsent,
      });

      const emailResult = await sendConfirmationEmail(normalizedEmail, input.firstName, confirmation.token);

      return {
        success: true,
        newUserId: newUser.insertId,
        emailSent: emailResult.success,
        message: emailResult.success
          ? "تم التسجيل بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد حسابك."
          : "تم التسجيل بنجاح! (لم يتم إرسال البريد - يرجى التحقق من إعدادات SMTP)",
      };
    }),

  confirmEmail: publicQuery
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      try {
        const decoded = jwt.verify(input.token, JWT_SECRET) as { email: string };
        const tokenHash = hashConfirmationToken(input.token);
        const account = await db
          .select({
            id: newUsers.id,
            emailConfirmed: newUsers.emailConfirmed,
            confirmationToken: newUsers.confirmationToken,
          })
          .from(newUsers)
          .where(eq(newUsers.email, decoded.email))
          .limit(1);

        if (account.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المستخدم غير موجود",
          });
        }

        if (account[0].emailConfirmed) {
          const [finalRows] = await getSqlPool().query<any[]>(
            `SELECT status FROM final_candidate_confirmations WHERE email = ? LIMIT 1`,
            [decoded.email.trim().toLowerCase()],
          );
          const finalCandidateConfirmed = finalRows[0]?.status === "confirmed";
          return { success: true, message: "تم تأكيد البريد الإلكتروني بنجاح", finalCandidateConfirmed, candidateSessionStarted: false };
        }

        if (account[0].confirmationToken !== tokenHash) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "المستخدم غير موجود",
          });
        }

        await db.update(newUsers).set({ emailConfirmed: true, confirmationToken: null }).where(eq(newUsers.email, decoded.email));
        await db.update(candidates).set({ emailConfirmed: true, confirmationToken: null }).where(eq(candidates.email, decoded.email));
        await getSqlPool().execute(
          `UPDATE final_candidate_confirmations
           SET status = 'confirmed', confirmedAt = CURRENT_TIMESTAMP, removedAt = NULL, removedByAdminId = NULL
           WHERE email = ? AND status = 'pending_email'`,
          [decoded.email.trim().toLowerCase()],
        );

        const [finalRows] = await getSqlPool().query<any[]>(
          `SELECT status FROM final_candidate_confirmations WHERE email = ? LIMIT 1`,
          [decoded.email.trim().toLowerCase()],
        );
        const finalCandidateConfirmed = finalRows[0]?.status === "confirmed";
        if (finalCandidateConfirmed) {
          const sessionToken = jwt.sign({ newUserId: account[0].id, email: decoded.email.trim().toLowerCase() }, JWT_SECRET, { expiresIn: "7d" });
          ctx.resHeaders.append("set-cookie", buildCandidateCookie(sessionToken));
        }
        return { success: true, message: "تم تأكيد البريد الإلكتروني بنجاح", finalCandidateConfirmed, candidateSessionStarted: finalCandidateConfirmed };
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رابط التأكيد غير صالح أو منتهي الصلاحية",
        });
      }
    }),

  resendConfirmation: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const normalizedEmail = input.email.trim().toLowerCase();
      await enforceAuthRateLimit({
        action: "confirmation_resend",
        req: ctx.req,
        email: normalizedEmail,
        limit: 5,
        windowMs: 15 * 60 * 1000,
        message: "Trop de demandes de renvoi ont été effectuées.",
      });
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

      const confirmation = createConfirmationToken(normalizedEmail);

      await db.update(newUsers).set({ confirmationToken: confirmation.tokenHash }).where(eq(newUsers.email, normalizedEmail));

      const emailResult = await sendConfirmationEmail(normalizedEmail, account.firstName, confirmation.token);

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
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { ip, email: normalizedEmail } = await enforceAuthRateLimit({
        action: "password_reset",
        req: ctx.req,
        email: input.email,
        limit: 5,
        windowMs: 7 * 60 * 1000,
        message: "Trop de demandes de réinitialisation.",
      });
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
        await securityLog("password_reset_unknown_email", {
          ip,
          email: normalizedEmail,
        });
        return { success: true };
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
      await sendPasswordResetEmail(account.email, account.firstName, resetUrl);

      return { success: true };
    }),

  resetPassword: publicQuery
    .input(
      z
        .object({
          token: z.string().min(20),
          password: strongPasswordSchema,
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: "كلمتا المرور غير متطابقتين",
          path: ["confirmPassword"],
        }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const tokenHash = hashPasswordResetToken(input.token);
      const [account] = await db
        .select({
          id: newUsers.id,
          email: newUsers.email,
          passwordResetExpiresAt: newUsers.passwordResetExpiresAt,
        })
        .from(newUsers)
        .where(eq(newUsers.passwordResetToken, tokenHash))
        .limit(1);

      if (!account || !account.passwordResetExpiresAt || account.passwordResetExpiresAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية",
        });
      }
      const pendingInvitation = await db
        .select({ id: candidateInvitations.id })
        .from(candidateInvitations)
        .where(and(
          eq(candidateInvitations.email, account.email),
          eq(candidateInvitations.status, "pending"),
        ))
        .limit(1);
      if (pendingInvitation.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "تمت دعوتكم مسبقاً. يرجى استعمال رابط التفعيل المرسل إلى بريدكم الإلكتروني بدلاً من إنشاء حساب جديد.",
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
      const { ip, email: normalizedEmail } = await enforceAuthRateLimit({
        action: "candidate_login",
        req: ctx.req,
        email: input.email,
        limit: 5,
        windowMs: 60 * 1000,
        message: "Trop de tentatives de connexion.",
      });
      const [account] = await db
        .select(newUserBaseSelection)
        .from(newUsers)
        .where(eq(newUsers.email, normalizedEmail))
        .limit(1);

      if (!account) {
        await securityLog("candidate_login_unknown_email", {
          ip,
          email: normalizedEmail,
        });
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
        });
      }

      const valid = await bcrypt.compare(input.password, account.password);
      if (!valid) {
        await securityLog("candidate_login_bad_password", {
          ip,
          email: normalizedEmail,
          accountId: account.id,
        });
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

      const [finalConfirmationRows] = await getSqlPool().query<any[]>(
        `SELECT status FROM final_candidate_confirmations
         WHERE newUserId = ? AND email = ? LIMIT 1`,
        [account.id, normalizedEmail],
      );
      const isFinalCandidate = finalConfirmationRows[0]?.status === "confirmed";

      const token = jwt.sign({ newUserId: account.id, email: account.email }, JWT_SECRET, { expiresIn: "7d" });
      ctx.resHeaders.append("set-cookie", buildCandidateCookie(token));

      await db.update(newUsers).set({ lastLoginAt: new Date() }).where(eq(newUsers.id, account.id));

      await upsertUser({
        unionId: `newuser:${account.id}`,
        name: `${account.firstName} ${account.lastName}`.trim(),
        email: account.email,
        role: "user",
        status: account.isAmbassador ? "ambassador" : isFinalCandidate ? "candidate" : "user",
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
          isFinalCandidate,
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
        .select({ id: candidates.id, applicationStatus: candidates.applicationStatus })
        .from(candidates)
        .where(eq(candidates.newUserId, decoded.newUserId))
        .limit(1);
      const [finalConfirmationRows] = await getSqlPool().query<any[]>(
        `SELECT status FROM final_candidate_confirmations WHERE newUserId = ? AND email = ? LIMIT 1`,
        [decoded.newUserId, decoded.email.trim().toLowerCase()],
      );

      if (!account) return null;

      return {
        id: account.id,
        firstName: account.firstName,
        lastName: account.lastName,
        email: account.email,
        isAmbassador: account.isAmbassador,
        studyStatus: account.studyStatus,
        hasSubmittedQuestionnaire: !!candidateRecord,
        applicationStatus: candidateRecord?.applicationStatus ?? null,
        finalConfirmationStatus: finalConfirmationRows[0]?.status ?? null,
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
        message: "الحساب غير موجود.",
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
    ctx.resHeaders.append("set-cookie", clearCandidateCookie());
    return { success: true };
  }),
});
