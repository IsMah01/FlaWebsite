import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { editions, editionImages } from "@db/schema";
import { eq } from "drizzle-orm";
import { getPublicEditionByNumber, publicEditions } from "./edition-content";

export const editionsRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const allEditions = await db.select().from(editions).orderBy(editions.editionNumber);
    const dbEditionNumbers = new Set(allEditions.map((edition) => edition.editionNumber));
    const fallbackEditions = publicEditions.filter(
      (edition) => !dbEditionNumbers.has(edition.editionNumber)
    );
    return [
      ...allEditions.map((edition) => ({ ...edition, links: [] as string[] })),
      ...fallbackEditions,
    ].sort((a, b) => a.editionNumber - b.editionNumber);
  }),

  getByNumber: publicQuery
    .input(z.object({ editionNumber: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const [edition] = await db
        .select()
        .from(editions)
        .where(eq(editions.editionNumber, input.editionNumber))
        .limit(1);

      if (!edition) {
        const fallbackEdition = getPublicEditionByNumber(input.editionNumber);
        return fallbackEdition ? { ...fallbackEdition, images: [] } : null;
      }

      const images = await db
        .select()
        .from(editionImages)
        .where(eq(editionImages.editionId, edition.id));

      const fallbackEdition = getPublicEditionByNumber(input.editionNumber);
      return { ...edition, images, links: fallbackEdition?.links ?? [] };
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

