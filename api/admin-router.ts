import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  candidates,
  contactMessages,
  editions,
  newUsers,
  users,
} from "@db/schema";

export const adminRouter = createRouter({
  stats: adminQuery.query(async () => {
    const db = getDb();
    const [allCandidates, allMessages, allEditions, allNewUsers, allUsers] = await Promise.all([
      db.select().from(candidates),
      db.select().from(contactMessages),
      db.select().from(editions),
      db
        .select({
          id: newUsers.id,
          newsletterConsent: newUsers.newsletterConsent,
        })
        .from(newUsers),
      db.select().from(users),
    ]);

    return {
      candidates: allCandidates.length,
      newUsers: allNewUsers.length,
      users: allUsers.length,
      confirmedCandidates: allCandidates.filter((c) => c.emailConfirmed).length,
      ambassadors: allCandidates.filter((c) => c.isAmbassador).length,
      pendingCandidates: allCandidates.filter((c) => (c as any).applicationStatus === "pending").length,
      acceptedCandidates: allCandidates.filter((c) => (c as any).applicationStatus === "accepted").length,
      rejectedCandidates: allCandidates.filter((c) => (c as any).applicationStatus === "rejected").length,
      messages: allMessages.length,
      editions: allEditions.length,
      newsletterSubscribers: allNewUsers.filter((user) => user.newsletterConsent).length,
    };
  }),

  listNewUsers: adminQuery.query(async () => {
    const db = getDb();
    const [rows, candidateLinks] = await Promise.all([
      db
        .select({
          id: newUsers.id,
          firstName: newUsers.firstName,
          lastName: newUsers.lastName,
          phoneNumber: newUsers.phoneNumber,
          studyStatus: newUsers.studyStatus,
          email: newUsers.email,
          emailConfirmed: newUsers.emailConfirmed,
          isAmbassador: newUsers.isAmbassador,
          attestationUrl: newUsers.attestationUrl,
          createdAt: newUsers.createdAt,
          lastLoginAt: newUsers.lastLoginAt,
        })
        .from(newUsers)
        .orderBy(desc(newUsers.createdAt)),
      db
        .select({
          newUserId: candidates.newUserId,
        })
        .from(candidates),
    ]);

    const candidateIds = new Set(candidateLinks.map((entry) => entry.newUserId));

    return rows.map((account) => ({
      id: account.id,
      name: `${account.firstName} ${account.lastName}`.trim(),
      phone: account.phoneNumber,
      studyStatus: account.studyStatus,
      email: account.email,
      emailConfirmed: account.emailConfirmed,
      role: candidateIds.has(account.id)
        ? "candidate"
        : account.isAmbassador
          ? "ambassador"
          : "user",
      documents: null,
      attestationUrl: account.attestationUrl,
      loginDate: account.lastLoginAt ?? account.createdAt,
    }));
  }),

  listUsers: adminQuery.query(async () => {
    const db = getDb();
    const [platformUsers, allNewUsers] = await Promise.all([
      db
        .select()
        .from(users)
        .orderBy(desc(users.date)),
      db
        .select({
          id: newUsers.id,
          phoneNumber: newUsers.phoneNumber,
        })
        .from(newUsers),
    ]);

    const phoneByUnionId = new Map<string, string>(
      allNewUsers.map((account) => [`newuser:${account.id}`, account.phoneNumber] as const),
    );

    return platformUsers.map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      phone: phoneByUnionId.get(entry.unionId) ?? null,
      lastLoginAt: entry.lastSignInAt,
    }));
  }),

  listCandidates: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        studyStatus: candidates.studyStatus,
        attestationUrl: candidates.attestationUrl,
        idCardUrl: candidates.idCardUrl,
        phoneNumber: candidates.phoneNumber,
        email: candidates.email,
        isAmbassador: candidates.isAmbassador,
        emailConfirmed: candidates.emailConfirmed,
        newsletterConsent: candidates.newsletterConsent,
        applicationStatus: (candidates as any).applicationStatus,
        adminNote: (candidates as any).adminNote,
        questionnaireAnswers: (candidates as any).questionnaireAnswers,
        createdAt: candidates.createdAt,
        updatedAt: candidates.updatedAt,
      })
      .from(candidates)
      .orderBy(desc(candidates.createdAt));
  }),

  updateCandidateStatus: adminQuery
    .input(
      z.object({
        candidateId: z.number(),
        status: z.enum(["pending", "accepted", "rejected"]),
        adminNote: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(candidates)
        .set({
          applicationStatus: input.status,
          adminNote: input.adminNote || null,
        } as any)
        .where(eq(candidates.id, input.candidateId));

      return { success: true };
    }),

  listContactMessages: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }),

  listNewsletterSubscribers: adminQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({
        id: newUsers.id,
        firstName: newUsers.firstName,
        lastName: newUsers.lastName,
        email: newUsers.email,
        phoneNumber: newUsers.phoneNumber,
        studyStatus: newUsers.studyStatus,
        newsletterConsent: newUsers.newsletterConsent,
        createdAt: newUsers.createdAt,
      })
      .from(newUsers)
      .orderBy(desc(newUsers.createdAt));

    return rows
      .filter((account) => account.newsletterConsent)
      .map((account) => ({
        id: account.id,
        name: `${account.firstName} ${account.lastName}`.trim(),
        email: account.email,
        phone: account.phoneNumber,
        studyStatus: account.studyStatus,
        subscribedAt: account.createdAt,
      }));
  }),
});
