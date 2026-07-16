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
        throw new Error("Email ou mot de passe incorrect");
      }

      const ok = await bcrypt.compare(input.password, admin.passwordHash);
      if (!ok) {
        await securityLog("admin_login_bad_password", {
          ip,
          email: normalizedEmail,
          adminId: admin.id,
        });
        throw new Error("Email ou mot de passe incorrect");
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
