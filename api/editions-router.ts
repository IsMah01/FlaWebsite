import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { editions } from "@db/schema";
import { eq } from "drizzle-orm";
import { getPublicEditionByNumber, publicEditions } from "./edition-content";

export const editionsRouter = createRouter({
  list: publicQuery.query(async () => {
    return publicEditions;
  }),

  getByNumber: publicQuery
    .input(z.object({ editionNumber: z.number() }))
    .query(async ({ input }) => {
      const edition = getPublicEditionByNumber(input.editionNumber);
      if (!edition) return null;
      return { ...edition, images: [] };
    }),

  create: adminQuery
    .input(
      z.object({
        editionNumber: z.number(),
        title: z.string(),
        description: z.string().optional(),
        dateRange: z.string().optional(),
        eventDate: z.string().optional(),
        eventTime: z.string().optional(),
        location: z.string().optional(),
        speakers: z.string().optional(),
        guests: z.string().optional(),
        conferences: z.string().optional(),
        activities: z.string().optional(),
        videoUrl: z.string().optional(),
        coverImage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [result] = await db.insert(editions).values(input);
      return { success: true, editionId: result.insertId };
    }),

  update: adminQuery
    .input(
      z.object({
        editionNumber: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        dateRange: z.string().optional(),
        eventDate: z.string().optional(),
        eventTime: z.string().optional(),
        location: z.string().optional(),
        speakers: z.string().optional(),
        guests: z.string().optional(),
        conferences: z.string().optional(),
        activities: z.string().optional(),
        videoUrl: z.string().optional(),
        coverImage: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { editionNumber, ...data } = input;
      await db.update(editions).set(data).where(eq(editions.editionNumber, editionNumber));
      return { success: true };
    }),
});
