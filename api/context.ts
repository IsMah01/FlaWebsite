import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { AdminUser, User } from "@db/schema";
import { authenticateRequest } from "./kimi/auth";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { adminUsers } from "@db/schema";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User & { adminRole?: AdminUser["role"] };
  adminUser?: AdminUser;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const resHeaders = opts.resHeaders;
  const internalAdmin = await getInternalAdminFromRequest(opts.req);
  if (internalAdmin) {
    return {
      user: internalAdmin.user,
      adminUser: internalAdmin.adminUser,
      resHeaders,
      req: opts.req,
    };
  }
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    ctx.user = await authenticateRequest(opts.req.headers);
  } catch {
    // Authentication is optional here
  }
  
  return ctx;
}

function readCookie(cookieHeader: string | null | undefined, name: string) {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  const found = cookies.find((c) => c.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

async function getInternalAdminFromRequest(req: Request) {
  const token = readCookie(req.headers.get("cookie"), "admin_token");
  if (!token) return null;

  try {
    const secret = process.env.APP_SECRET;
    if (!secret) return null;

    const payload = jwt.verify(token, secret) as {
      type?: string;
      id?: number;
      email?: string;
      role?: string;
    };

    if (payload.type !== "admin" || !payload.id) return null;

    const db = getDb();
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, payload.id))
      .limit(1);

    if (!admin || !admin.isActive) return null;

    return {
      adminUser: admin,
      user: {
      id: admin.id,
      unionId: `internal-admin-${admin.id}`,
      name: admin.name,
      email: admin.email,
      avatar: null,
      role: "admin" as const,
      status: "admin" as const,
      adminRole: admin.role,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
      lastSignInAt: new Date(),
      date: new Date(),
      },
    };
  } catch {
    return null;
  }
}
