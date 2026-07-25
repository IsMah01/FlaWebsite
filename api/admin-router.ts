import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery, superAdminQuery } from "./middleware";
import { getDb, getSqlPool } from "./queries/connection";
import {
  candidates,
  adminUsers,
  ambassadorMessages,
  contactMessages,
  editions,
  newUsers,
  users,
} from "@db/schema";
import { sendCandidateActivationInvitationEmail } from "./lib/email";

const CANDIDATE_INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function createCandidateInvitationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + CANDIDATE_INVITATION_LIFETIME_MS),
  };
}

async function runWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  worker: (value: T) => Promise<R>,
) {
  const results: R[] = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await worker(values[index]);
    }
  }));
  return results;
}

const adminPasswordSchema = z.string()
  .min(8, "Le mot de passe doit contenir au moins 8 caracteres.")
  .max(128)
  .regex(/[A-Z]/, "Le mot de passe doit contenir une majuscule.");

export const adminRouter = createRouter({
  importCandidateInvitations: superAdminQuery
    .input(z.object({
      rows: z.array(z.object({
        firstName: z.string().trim().min(1).max(255),
        lastName: z.string().trim().min(1).max(255),
        email: z.string().trim().email().max(320),
        phoneNumber: z.string().trim().max(50).optional().default(""),
      })).min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const normalized = input.rows.map((row, index) => ({
        ...row,
        email: row.email.toLowerCase(),
        rowNumber: index + 2,
      }));
      const seen = new Set<string>();
      const results: Array<{
        rowNumber: number;
        email: string;
        status: "created" | "duplicate_file" | "already_registered" | "already_invited" | "failed";
        message: string;
        invitationId?: number;
        token?: string;
        expiresAt?: Date;
        firstName?: string;
      }> = [];
      const toNotify: Array<{
        resultIndex: number;
        invitationId: number;
        email: string;
        firstName: string;
        token: string;
        expiresAt: Date;
      }> = [];
      const pool = getSqlPool();

      for (const row of normalized) {
        if (seen.has(row.email)) {
          results.push({
            rowNumber: row.rowNumber,
            email: row.email,
            status: "duplicate_file",
            message: "Adresse répétée dans le fichier.",
          });
          continue;
        }
        seen.add(row.email);
        const [existingAccounts] = await pool.query<any[]>(
          `SELECT
             (SELECT id FROM new_users WHERE email = ? LIMIT 1) AS accountId,
             (SELECT id FROM candidates WHERE email = ? LIMIT 1) AS candidateId,
             (SELECT id FROM candidate_invitations WHERE email = ? LIMIT 1) AS invitationId,
             (SELECT status FROM candidate_invitations WHERE email = ? LIMIT 1) AS invitationStatus`,
          [row.email, row.email, row.email, row.email],
        );
        const existing = existingAccounts[0];
        if (existing.accountId || existing.candidateId) {
          results.push({
            rowNumber: row.rowNumber,
            email: row.email,
            status: "already_registered",
            message: "Un compte existe déjà avec cette adresse.",
          });
          continue;
        }
        if (existing.invitationId && existing.invitationStatus !== "revoked") {
          results.push({
            rowNumber: row.rowNumber,
            email: row.email,
            status: "already_invited",
            message: "Une invitation en attente existe déjà.",
            invitationId: Number(existing.invitationId),
          });
          continue;
        }

        const invitation = createCandidateInvitationToken();
        try {
          const [inserted] = existing.invitationStatus === "revoked"
            ? await pool.execute<any>(
                `UPDATE candidate_invitations
                 SET firstName = ?, lastName = ?, phoneNumber = ?, tokenHash = ?,
                     status = 'pending', expiresAt = ?, invitedByAdminId = ?,
                     emailSentAt = NULL, emailError = NULL, activatedAt = NULL
                 WHERE id = ? AND status = 'revoked'`,
                [
                  row.firstName,
                  row.lastName,
                  row.phoneNumber || "",
                  invitation.hash,
                  invitation.expiresAt,
                  ctx.adminUser.id,
                  existing.invitationId,
                ],
              )
            : await pool.execute<any>(
                `INSERT INTO candidate_invitations
                   (firstName, lastName, email, phoneNumber, tokenHash, expiresAt, invitedByAdminId)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  row.firstName,
                  row.lastName,
                  row.email,
                  row.phoneNumber || "",
                  invitation.hash,
                  invitation.expiresAt,
                  ctx.adminUser.id,
                ],
              );
          const invitationId = existing.invitationStatus === "revoked"
            ? Number(existing.invitationId)
            : inserted.insertId;
          if (existing.invitationStatus === "revoked" && inserted.affectedRows !== 1) {
            throw new Error("Invitation state changed during import.");
          }
          const resultIndex = results.length;
          results.push({
            rowNumber: row.rowNumber,
            email: row.email,
            status: "created",
            message: "Invitation créée.",
            invitationId,
            token: invitation.token,
            expiresAt: invitation.expiresAt,
            firstName: row.firstName,
          });
          toNotify.push({
            resultIndex,
            invitationId,
            email: row.email,
            firstName: row.firstName,
            token: invitation.token,
            expiresAt: invitation.expiresAt,
          });
        } catch (error) {
          results.push({
            rowNumber: row.rowNumber,
            email: row.email,
            status: "failed",
            message: (error as { code?: string }).code === "ER_DUP_ENTRY"
              ? "Cette adresse existe déjà."
              : "Impossible de créer l’invitation.",
          });
        }
      }

      await runWithConcurrency(toNotify, 5, async (entry) => {
        const emailResult = await sendCandidateActivationInvitationEmail({
          to: entry.email,
          firstName: entry.firstName,
          activationToken: entry.token,
          expiresAt: entry.expiresAt,
        });
        await pool.execute(
          `UPDATE candidate_invitations
           SET emailSentAt = ?, emailError = ?
           WHERE id = ?`,
          [
            emailResult.success ? new Date() : null,
            emailResult.success ? null : (emailResult.reason || "Échec SMTP").slice(0, 2000),
            entry.invitationId,
          ],
        );
        results[entry.resultIndex].message = emailResult.success
          ? "Invitation créée et e-mail envoyé."
          : "Invitation créée, mais l’e-mail n’a pas pu être envoyé.";
      });

      return {
        results: results.map(({ token: _token, expiresAt: _expiresAt, firstName: _firstName, ...result }) => result),
        createdCount: results.filter((result) => result.status === "created").length,
        emailSentCount: results.filter((result) => result.status === "created" && result.message.includes("envoyé")).length,
      };
    }),

  listCandidateInvitations: superAdminQuery.query(async () => {
    const [rows] = await getSqlPool().query<any[]>(
      `SELECT id, firstName, lastName, email, phoneNumber, status, expiresAt,
         emailSentAt, emailError, resendCount, activatedAt, createdAt
       FROM candidate_invitations
       ORDER BY createdAt DESC
       LIMIT 1000`,
    );
    return rows;
  }),

  resendCandidateInvitation: superAdminQuery
    .input(z.object({ invitationId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const pool = getSqlPool();
      const [rows] = await pool.query<any[]>(
        `SELECT id, firstName, email, status
         FROM candidate_invitations WHERE id = ? LIMIT 1`,
        [input.invitationId],
      );
      const current = rows[0];
      if (!current) throw new TRPCError({ code: "NOT_FOUND", message: "Invitation introuvable." });
      if (current.status !== "pending") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Cette invitation n’est plus en attente." });
      }
      const invitation = createCandidateInvitationToken();
      const [updated] = await pool.execute<any>(
        `UPDATE candidate_invitations
         SET tokenHash = ?, expiresAt = ?, invitedByAdminId = ?,
             emailSentAt = NULL, emailError = NULL, resendCount = resendCount + 1
         WHERE id = ? AND status = 'pending'`,
        [invitation.hash, invitation.expiresAt, ctx.adminUser.id, current.id],
      );
      if (updated.affectedRows !== 1) {
        throw new TRPCError({ code: "CONFLICT", message: "Cette invitation vient d’être activée ou annulée." });
      }
      const result = await sendCandidateActivationInvitationEmail({
        to: current.email,
        firstName: current.firstName,
        activationToken: invitation.token,
        expiresAt: invitation.expiresAt,
      });
      await pool.execute(
        "UPDATE candidate_invitations SET emailSentAt = ?, emailError = ? WHERE id = ?",
        [
          result.success ? new Date() : null,
          result.success ? null : (result.reason || "Échec SMTP").slice(0, 2000),
          current.id,
        ],
      );
      return { success: true, emailSent: result.success };
    }),

  revokeCandidateInvitation: superAdminQuery
    .input(z.object({ invitationId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const [result] = await getSqlPool().execute<any>(
        "UPDATE candidate_invitations SET status = 'revoked' WHERE id = ? AND status = 'pending'",
        [input.invitationId],
      );
      if (result.affectedRows !== 1) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Cette invitation n’est plus en attente." });
      }
      return { success: true };
    }),

  createAcceptedTestCandidate: superAdminQuery
    .input(z.object({
      firstName: z.string().trim().min(1).max(255),
      lastName: z.string().trim().min(1).max(255),
      email: z.string().trim().email().max(320),
      phoneNumber: z.string().trim().min(1).max(50),
      password: adminPasswordSchema,
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = input.email.toLowerCase();
      const [existingAccount] = await db
        .select({ id: newUsers.id })
        .from(newUsers)
        .where(eq(newUsers.email, email))
        .limit(1);
      const [existingCandidate] = await db
        .select({ id: candidates.id })
        .from(candidates)
        .where(eq(candidates.email, email))
        .limit(1);

      if (existingAccount || existingCandidate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Un compte candidat existe déjà avec cet e-mail.",
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const result = await db.transaction(async (tx) => {
        const [account] = await tx.insert(newUsers).values({
          firstName: input.firstName,
          lastName: input.lastName,
          studyStatus: "other",
          phoneNumber: input.phoneNumber,
          email,
          password: passwordHash,
          emailConfirmed: true,
          newsletterConsent: false,
        });
        const [candidate] = await tx.insert(candidates).values({
          newUserId: account.insertId,
          firstName: input.firstName,
          lastName: input.lastName,
          studyStatus: "other",
          phoneNumber: input.phoneNumber,
          email,
          password: passwordHash,
          emailConfirmed: true,
          newsletterConsent: false,
          applicationStatus: "accepted",
          questionnaireAnswers: JSON.stringify([]),
          adminNote: "Compte de test créé par le super-admin.",
        });
        return { accountId: account.insertId, candidateId: candidate.insertId };
      });

      return { success: true, ...result };
    }),

  listInterviewAdmins: superAdminQuery.query(async () => {
    const [rows] = await getSqlPool().query<any[]>(`
      SELECT admins.id, admins.name, admins.email, admins.phoneNumber, admins.isActive, admins.createdAt,
        COUNT(DISTINCT assignments.candidateId) AS assignedCandidates,
        COUNT(DISTINCT CASE WHEN slots.status = 'scheduled' THEN slots.id END) AS scheduledSlots
      FROM admin_users admins
      LEFT JOIN interview_candidate_assignments assignments ON assignments.adminId = admins.id
      LEFT JOIN interview_slots slots ON slots.createdByAdminId = admins.id
      WHERE admins.role = 'interview_admin'
      GROUP BY admins.id, admins.name, admins.email, admins.isActive, admins.createdAt
      ORDER BY admins.createdAt DESC
    `);
    return rows.map((row) => ({
      ...row,
      assignedCandidates: Number(row.assignedCandidates),
      scheduledSlots: Number(row.scheduledSlots),
    }));
  }),

  createInterviewAdmin: superAdminQuery
    .input(z.object({
      name: z.string().trim().min(2).max(255),
      email: z.string().trim().email().max(320),
      phoneNumber: z.string().trim().max(50).optional().default(""),
      password: adminPasswordSchema,
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const email = input.email.toLowerCase();
      const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "Un compte existe déjà avec cet e-mail." });
      await db.insert(adminUsers).values({
        name: input.name,
        email,
        phoneNumber: input.phoneNumber || null,
        passwordHash: await bcrypt.hash(input.password, 12),
        role: "interview_admin",
        isActive: true,
      });
      return { success: true };
    }),

  setInterviewAdminActive: superAdminQuery
    .input(z.object({ id: z.number().int().positive(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [target] = await db.select({ id: adminUsers.id }).from(adminUsers)
        .where(and(eq(adminUsers.id, input.id), eq(adminUsers.role, "interview_admin"))).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Mini-admin introuvable." });
      if (!input.isActive) {
        const [workloadRows] = await getSqlPool().query<any[]>(
          `SELECT
             (SELECT COUNT(*) FROM interview_candidate_assignments WHERE adminId = ?) AS assignments,
             (SELECT COUNT(*) FROM interview_slots WHERE createdByAdminId = ? AND status = 'scheduled') AS scheduledSlots`,
          [target.id, target.id],
        );
        const workload = workloadRows[0];
        if (Number(workload.assignments) > 0 || Number(workload.scheduledSlots) > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Reattribuez d'abord ses ${workload.assignments} candidat(s) et traitez ses ${workload.scheduledSlots} creneau(x) planifie(s).`,
          });
        }
      }
      await db.update(adminUsers).set({ isActive: input.isActive }).where(eq(adminUsers.id, target.id));
      return { success: true };
    }),

  updateInterviewAdmin: superAdminQuery
    .input(z.object({
      id: z.number().int().positive(),
      name: z.string().trim().min(2).max(255),
      email: z.string().trim().email().max(320),
      phoneNumber: z.string().trim().max(50).optional().default(""),
      password: z.union([z.literal(""), adminPasswordSchema]),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [target] = await db.select({ id: adminUsers.id }).from(adminUsers)
        .where(and(eq(adminUsers.id, input.id), eq(adminUsers.role, "interview_admin"))).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Mini-admin introuvable." });

      const email = input.email.toLowerCase();
      const [existing] = await db.select({ id: adminUsers.id }).from(adminUsers)
        .where(eq(adminUsers.email, email)).limit(1);
      if (existing && existing.id !== target.id) {
        throw new TRPCError({ code: "CONFLICT", message: "Un compte existe deja avec cet e-mail." });
      }

      await db.update(adminUsers).set({
        name: input.name,
        email,
        phoneNumber: input.phoneNumber || null,
        ...(input.password ? {
          passwordHash: await bcrypt.hash(input.password, 12),
          passwordResetToken: null,
          passwordResetExpiresAt: null,
        } : {}),
      }).where(eq(adminUsers.id, target.id));
      return { success: true };
    }),

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

  listRegistrationsToFollowUp: adminQuery.query(async () => {
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
        .orderBy(desc(newUsers.createdAt)),
      db.select({ newUserId: candidates.newUserId }).from(candidates),
    ]);

    const submittedIds = new Set(submittedCandidates.map((candidate) => candidate.newUserId));
    return accounts
      .filter((account) => !account.emailConfirmed || (!account.questionnaireDraft && !submittedIds.has(account.id)))
      .map((account) => ({
        ...account,
        hasStartedQuestionnaire: Boolean(account.questionnaireDraft) || submittedIds.has(account.id),
      }));
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

  setCandidateAmbassador: adminQuery
    .input(z.object({ candidateId: z.number().int().positive(), isAmbassador: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [candidate] = await db
        .select({ newUserId: candidates.newUserId })
        .from(candidates)
        .where(eq(candidates.id, input.candidateId))
        .limit(1);
      if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "Candidat introuvable." });
      await Promise.all([
        db.update(candidates).set({ isAmbassador: input.isAmbassador }).where(eq(candidates.id, input.candidateId)),
        db.update(newUsers).set({ isAmbassador: input.isAmbassador }).where(eq(newUsers.id, candidate.newUserId)),
      ]);
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
