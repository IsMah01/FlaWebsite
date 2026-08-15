import { z } from "zod";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { adminUsers } from "@db/schema";
import { sendPasswordResetEmail } from "./lib/email";
import { getClientIp, rateLimitOrThrow, securityLog } from "./lib/abuse-protection";
import { secureCookieSuffix } from "./lib/cookie-security";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const ADMIN_PROFILE_DIR = path.resolve(process.cwd(), "storage", "private", "uploads", "admin-profiles");

const ADMIN_COOKIE_NAME = "admin_token";
const ADMIN_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const strongPasswordSchema = z
  .string()
  .regex(
    /^(?=.*[A-Z]).{8,}$/,
    "Le mot de passe doit contenir au moins 8 caractères et une majuscule",
  );

function getJwtSecret() {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET is required");
  }
  return secret;
}

function buildAdminCookie(token: string) {
  const secure = secureCookieSuffix();
  return `${ADMIN_COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${ADMIN_TOKEN_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

function clearAdminCookie() {
  const secure = secureCookieSuffix();
  return `${ADMIN_COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax${secure}`;
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

async function enforceAuthRateLimit(options: {
  action: "admin_password_reset" | "admin_login";
  req: Request;
  email: string;
  limit: number;
  windowMs: number;
  message: string;
}) {
  const ip = getClientIp(options.req);
  const email = options.email.trim().toLowerCase();
  await rateLimitOrThrow({
    key: `${options.action}:ip:${ip}`,
    limit: options.limit,
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

export const adminAuthRouter = createRouter({
  profile: publicQuery.query(async ({ ctx }) => {
    if (!ctx.adminUser || ctx.adminUser.role !== "interview_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux mini-admins." });
    return { name: ctx.adminUser.name, email: ctx.adminUser.email, phoneNumber: ctx.adminUser.phoneNumber, description: ctx.adminUser.profileDescription || "", profileImageUrl: ctx.adminUser.profileImageRef ? `/api/admin/profile-image/${ctx.adminUser.profileImageRef}` : null };
  }),
  updateProfile: publicQuery.input(z.object({ description: z.string().trim().max(500), image: z.object({ mimeType: z.enum(["image/jpeg", "image/png"]), data: z.string().min(1) }).optional() })).mutation(async ({ input, ctx }) => {
    if (!ctx.adminUser || ctx.adminUser.role !== "interview_admin") throw new TRPCError({ code: "FORBIDDEN", message: "Accès réservé aux mini-admins." });
    await rateLimitOrThrow({ key: `mini-admin-profile:${ctx.adminUser.id}`, limit: 10, windowMs: 60 * 60 * 1000, message: "Trop de modifications. Réessayez plus tard." });
    let imageRef = ctx.adminUser.profileImageRef || null;
    if (input.image) {
      const buffer = Buffer.from(input.image.data, "base64");
      if (!buffer.length || buffer.length > 2 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "L’image ne doit pas dépasser 2 Mo." });
      const jpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const png = buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
      if ((input.image.mimeType === "image/jpeg" && !jpeg) || (input.image.mimeType === "image/png" && !png)) throw new TRPCError({ code: "BAD_REQUEST", message: "Image JPG ou PNG invalide." });
      await mkdir(ADMIN_PROFILE_DIR, { recursive: true, mode: 0o700 });
      const nextRef = `admin-${ctx.adminUser.id}-${crypto.randomUUID()}${input.image.mimeType === "image/png" ? ".png" : ".jpg"}`;
      await writeFile(path.join(ADMIN_PROFILE_DIR, nextRef), buffer, { mode: 0o600 });
      if (imageRef) await unlink(path.join(ADMIN_PROFILE_DIR, imageRef)).catch(() => undefined);
      imageRef = nextRef;
    }
    await getDb().update(adminUsers).set({ profileDescription: input.description || null, profileImageRef: imageRef }).where(eq(adminUsers.id, ctx.adminUser.id));
    return { success: true };
  }),
  requestPasswordReset: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { ip, email: normalizedEmail } = await enforceAuthRateLimit({
        action: "admin_password_reset",
        req: ctx.req,
        email: input.email,
        limit: 5,
        windowMs: 7 * 60 * 1000,
        message: "Trop de demandes de réinitialisation.",
      });
      const [admin] = await db
        .select({
          id: adminUsers.id,
          name: adminUsers.name,
          email: adminUsers.email,
          isActive: adminUsers.isActive,
        })
        .from(adminUsers)
        .where(eq(adminUsers.email, normalizedEmail))
        .limit(1);

      if (!admin || !admin.isActive) {
        await securityLog("admin_password_reset_unknown_email", {
          ip,
          email: normalizedEmail,
        });
        return { success: true };
      }

      const reset = createPasswordResetToken();
      await db
        .update(adminUsers)
        .set({
          passwordResetToken: reset.tokenHash,
          passwordResetExpiresAt: reset.expiresAt,
        })
        .where(eq(adminUsers.id, admin.id));

      const resetUrl = `${process.env.APP_URL || "http://localhost:3000"}/admin/reset-password?token=${reset.token}`;
      await sendPasswordResetEmail(admin.email, admin.name, resetUrl);

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
          message: "Les mots de passe ne correspondent pas",
          path: ["confirmPassword"],
        }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const tokenHash = hashPasswordResetToken(input.token);
      const [admin] = await db
        .select({
          id: adminUsers.id,
          passwordResetExpiresAt: adminUsers.passwordResetExpiresAt,
          isActive: adminUsers.isActive,
        })
        .from(adminUsers)
        .where(eq(adminUsers.passwordResetToken, tokenHash))
        .limit(1);

      if (!admin || !admin.isActive || !admin.passwordResetExpiresAt || admin.passwordResetExpiresAt.getTime() < Date.now()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lien de reinitialisation invalide ou expire",
        });
      }

      await db
        .update(adminUsers)
        .set({
          passwordHash: await bcrypt.hash(input.password, 12),
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        })
        .where(eq(adminUsers.id, admin.id));

      return { success: true };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { ip, email: normalizedEmail } = await enforceAuthRateLimit({
        action: "admin_login",
        req: ctx.req,
        email: input.email,
        limit: 5,
        windowMs: 5 * 60 * 1000,
        message: "Trop de tentatives de connexion.",
      });
      const [admin] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, normalizedEmail))
        .limit(1);

      if (!admin || !admin.isActive) {
        await securityLog("admin_login_unknown_email", {
          ip,
          email: normalizedEmail,
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou mot de passe incorrect",
        });
      }

      const ok = await bcrypt.compare(input.password, admin.passwordHash);
      if (!ok) {
        await securityLog("admin_login_bad_password", {
          ip,
          email: normalizedEmail,
          adminId: admin.id,
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou mot de passe incorrect",
        });
      }

      const token = jwt.sign(
        {
          type: "admin",
          id: admin.id,
          email: admin.email,
          role: admin.role,
        },
        getJwtSecret(),
        { expiresIn: "7d" },
      );

      ctx.resHeaders.append("set-cookie", buildAdminCookie(token));

      return {
        success: true,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
        },
      };
    }),

  logout: publicQuery.mutation(async ({ ctx }) => {
    ctx.resHeaders.append("set-cookie", clearAdminCookie());
    return { success: true };
  }),
});
