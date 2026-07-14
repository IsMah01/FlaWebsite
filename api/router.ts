import { authRouter } from "./auth-router";
import { candidateAuthRouter } from "./candidate-auth-router";
import { editionsRouter } from "./editions-router";
import { contactRouter, newsletterRouter } from "./contact-router";
import { uploadRouter } from "./upload-router";
import { createRouter, publicQuery } from "./middleware";
import { adminRouter } from "./admin-router";
import { adminAuthRouter } from "./admin-auth-router";
import { ambassadorRouter } from "./ambassador-router";
import { interviewRouter } from "./interview-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  candidateAuth: candidateAuthRouter,
  editions: editionsRouter,
  contact: contactRouter,
  newsletter: newsletterRouter,
  upload: uploadRouter,
  admin: adminRouter,
  adminAuth: adminAuthRouter,
  ambassador: ambassadorRouter,
  interview: interviewRouter,
});

export type AppRouter = typeof appRouter;
