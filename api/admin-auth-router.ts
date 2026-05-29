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

const ADMIN_COOKIE_NAME = "admin_token";
const ADMIN_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getJwtSecret() {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET is required");
  }
  return secret;
}

function secureCookieSuffix() {
  return process.env.APP_URL?.startsWith("https://") ? "; Secure" : "";
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

export const adminAuthRouter = createRouter({
  requestPasswordReset: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const normalizedEmail = input.email.trim().toLowerCase();
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
        return { success: true, emailSent: false };
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
      const emailResult = await sendPasswordResetEmail(admin.email, admin.name, resetUrl);

      return { success: true, emailSent: emailResult.success };
    }),

  resetPassword: publicQuery
    .input(
      z
        .object({
          token: z.string().min(20),
          password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
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
      const [admin] = await db
        .select()
        .from(adminUsers)
        .where(eq(adminUsers.email, input.email.toLowerCase()))
        .limit(1);

      if (!admin || !admin.isActive) {
        throw new Error("Email ou mot de passe incorrect");
      }

      const ok = await bcrypt.compare(input.password, admin.passwordHash);
      if (!ok) {
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
