import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  candidates,
  ambassadorMessages,
  contactMessages,
  editions,
  newUsers,
  users,
} from "@db/schema";

export const adminRouter = createRouter({
  stats: adminQuery.query(async () => {
    const db = getDb();
    const [allCandidates, allMessages, allAmbassadorMessages, allEditions, allNewUsers, allUsers] = await Promise.all([
      db.select().from(candidates),
      db.select().from(contactMessages),
      db.select().from(ambassadorMessages),
      db.select().from(editions),
      db
        .select({
          id: newUsers.id,
          newsletterConsent: newUsers.newsletterConsent,
          questionnaireDraft: newUsers.questionnaireDraft,
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
      ambassadorMessages: allAmbassadorMessages.length,
      editions: allEditions.length,
      newsletterSubscribers: allNewUsers.filter((user) => user.newsletterConsent).length,
      incompleteQuestionnaires: allNewUsers.filter(
        (user) => Boolean(user.questionnaireDraft) && !allCandidates.some((candidate) => candidate.newUserId === user.id),
      ).length,
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
      unionId: entry.unionId,
      name: entry.name,
      email: entry.email,
      phone: phoneByUnionId.get(entry.unionId) ?? null,
      role: entry.role,
      status: entry.status,
      lastLoginAt: entry.lastSignInAt,
    }));
  }),

  deleteNewUser: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select({ id: newUsers.id })
        .from(newUsers)
        .where(eq(newUsers.id, input.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await db.delete(candidates).where(eq(candidates.newUserId, input.id));
      await db.delete(users).where(eq(users.unionId, `newuser:${input.id}`));
      await db.delete(newUsers).where(eq(newUsers.id, input.id));

      return { success: true };
    }),

  deleteUser: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [account] = await db
        .select({
          id: users.id,
          unionId: users.unionId,
          role: users.role,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!account) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (account.role === "admin" || account.status === "admin" || account.unionId.startsWith("internal-admin-")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Admin accounts cannot be deleted from this table",
        });
      }

      const linkedNewUserId = account.unionId.startsWith("newuser:")
        ? Number(account.unionId.replace("newuser:", ""))
        : null;

      if (linkedNewUserId && Number.isInteger(linkedNewUserId)) {
        await db.delete(candidates).where(eq(candidates.newUserId, linkedNewUserId));
        await db.delete(newUsers).where(eq(newUsers.id, linkedNewUserId));
      }

      await db.delete(users).where(eq(users.id, input.id));

      return { success: true };
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

  listIncompleteQuestionnaires: adminQuery.query(async () => {
    const db = getDb();
    const [accounts, submittedCandidates] = await Promise.all([
      db
        .select({
          id: newUsers.id,
          firstName: newUsers.firstName,
          lastName: newUsers.lastName,
          email: newUsers.email,
          phoneNumber: newUsers.phoneNumber,
          emailConfirmed: newUsers.emailConfirmed,
          questionnaireDraft: newUsers.questionnaireDraft,
          createdAt: newUsers.createdAt,
          updatedAt: newUsers.updatedAt,
          lastLoginAt: newUsers.lastLoginAt,
        })
        .from(newUsers)
        .orderBy(desc(newUsers.updatedAt)),
      db.select({ newUserId: candidates.newUserId }).from(candidates),
    ]);

    const submittedIds = new Set(submittedCandidates.map((candidate) => candidate.newUserId));
    return accounts
      .filter((account) => Boolean(account.questionnaireDraft) && !submittedIds.has(account.id))
      .map((account) => ({ ...account, questionnaireDraft: account.questionnaireDraft! }));
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

  listAmbassadorMessages: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        id: ambassadorMessages.id,
        authorName: ambassadorMessages.authorName,
        authorType: ambassadorMessages.authorType,
        authorCandidateId: ambassadorMessages.authorCandidateId,
        authorAdminId: ambassadorMessages.authorAdminId,
        message: ambassadorMessages.message,
        createdAt: ambassadorMessages.createdAt,
      })
      .from(ambassadorMessages)
      .orderBy(desc(ambassadorMessages.createdAt));
  }),

  deleteAmbassadorMessage: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(ambassadorMessages).where(eq(ambassadorMessages.id, input.id));
      return { success: true };
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
