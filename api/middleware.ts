import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { TrpcContext } from "./context";

const validationFieldLabels: Record<string, string> = {
  phoneNumber: "numéro de téléphone",
  description: "présentation",
  imageUrl: "image",
  email: "adresse e-mail",
  password: "mot de passe",
  confirmPassword: "confirmation du mot de passe",
  firstName: "prénom",
  lastName: "nom",
  startTime: "date de début",
  endTime: "date de fin",
};

function readableValidationMessage(error: ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Les informations envoyées sont invalides.";
  const fieldKey = String(issue.path.at(-1) ?? "");
  const field = validationFieldLabels[fieldKey] || fieldKey;
  if (issue.code === "invalid_type") {
    return field
      ? `Le champ « ${field} » est manquant ou invalide.`
      : "Une information obligatoire est manquante ou invalide.";
  }
  if (issue.code === "too_big") {
    return field ? `Le champ « ${field} » est trop long.` : "Une valeur saisie est trop longue.";
  }
  if (issue.code === "too_small") {
    return field ? `Le champ « ${field} » est incomplet.` : "Une information obligatoire est incomplète.";
  }
  return issue.message && !issue.message.trim().startsWith("[")
    ? issue.message
    : "Les informations envoyées sont invalides.";
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    if (error.cause instanceof ZodError) {
      return { ...shape, message: readableValidationMessage(error.cause) };
    }
    if (error.code === "INTERNAL_SERVER_ERROR") {
      return { ...shape, message: "Une erreur technique est survenue. Veuillez réessayer dans quelques instants." };
    }
    return shape;
  },
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
    if (ctx.user.role !== "admin" || !ctx.adminUser || ctx.adminUser.role === "interview_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: ErrorMessages.insufficientRole });
    }
    return next({ ctx: { ...ctx, adminUser: ctx.adminUser } });
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
