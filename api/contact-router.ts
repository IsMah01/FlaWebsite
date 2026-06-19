import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { contactMessages, newsletterSubscribers } from "@db/schema";
import { eq } from "drizzle-orm";
import { getClientIp, rateLimitOrThrow } from "./lib/abuse-protection";

export const contactRouter = createRouter({
  submit: publicQuery
    .input(
      z.object({
        name: z.string().min(1, "الاسم مطلوب"),
        email: z.string().email("بريد إلكتروني غير صالح"),
        phone: z.string().optional(),
        subject: z.string().min(1, "الموضوع مطلوب"),
        message: z.string().min(1, "الرسالة مطلوبة"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ip = getClientIp(ctx.req);
      await rateLimitOrThrow({
        key: `contact:${ip}`,
        limit: 5,
        windowMs: 10 * 60 * 1000,
        message: "Trop de messages ont été envoyés.",
      });
      const db = getDb();
      await db.insert(contactMessages).values(input);
      return { success: true, message: "تم إرسال رسالتك بنجاح" };
    }),
});

export const newsletterRouter = createRouter({
  subscribe: publicQuery
    .input(
      z.object({
        email: z.string().email("بريد إلكتروني غير صالح"),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const ip = getClientIp(ctx.req);
      await rateLimitOrThrow({
        key: `newsletter:${ip}`,
        limit: 10,
        windowMs: 60 * 60 * 1000,
        message: "Trop de demandes d’abonnement ont été effectuées.",
      });
      const db = getDb();
      const existing = await db
        .select()
        .from(newsletterSubscribers)
        .where(eq(newsletterSubscribers.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(newsletterSubscribers)
          .set({ isSubscribed: true, name: input.name || existing[0].name })
          .where(eq(newsletterSubscribers.email, input.email));
        return { success: true, message: "تم تحديث الاشتراك بنجاح" };
      }

      await db.insert(newsletterSubscribers).values({
        email: input.email,
        name: input.name || null,
      });

      return { success: true, message: "تم الاشتراك في النشرة البريدية بنجاح" };
    }),

  unsubscribe: publicQuery
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(newsletterSubscribers)
        .set({ isSubscribed: false })
        .where(eq(newsletterSubscribers.email, input.email));
      return { success: true, message: "تم إلغاء الاشتراك بنجاح" };
    }),
});
