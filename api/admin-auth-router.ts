import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { adminUsers } from "@db/schema";

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

export const adminAuthRouter = createRouter({
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
