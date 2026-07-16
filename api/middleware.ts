import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(
  t.middleware(async ({ ctx, next }) => {
    if (ctx.user.role !== "admin" || ctx.adminUser?.role === "interview_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
    }
    return next({ ctx });
  }),
);

export const interviewAdminQuery = authedQuery.use(
  t.middleware(async ({ ctx, next }) => {
    if (ctx.user.role !== "admin" || !ctx.adminUser || !["admin", "super_admin", "interview_admin"].includes(ctx.adminUser.role)) {
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
    }
    return next({ ctx: { ...ctx, adminUser: ctx.adminUser } });
  }),
);

export const superAdminQuery = adminQuery.use(
  t.middleware(async ({ ctx, next }) => {
    if (ctx.adminUser?.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
    }
    return next({ ctx: { ...ctx, adminUser: ctx.adminUser } });
  }),
);
