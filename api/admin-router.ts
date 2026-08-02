import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { and, desc, eq, inArray } from "drizzle-orm";
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
import { sendCandidateActivationInvitationEmail, sendCandidateFinalAdmissionEmail, sendCandidateInitialRejectionEmail, sendConfirmationEmail } from "./lib/email";

const CANDIDATE_INVITATION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const JWT_SECRET = process.env.APP_SECRET;

if (!JWT_SECRET) {
  throw new Error("APP_SECRET is required");
}

function createCandidateInvitationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    hash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + CANDIDATE_INVITATION_LIFETIME_MS),
  };
}

function createImportedAccountConfirmationToken(email: string) {
  const token = jwt.sign(
    { email, nonce: crypto.randomBytes(16).toString("hex") },
    JWT_SECRET,
    { expiresIn: "24h" },
  );
  return {
    token,
    hash: crypto.createHash("sha256").update(token).digest("hex"),
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
        status: "created" | "accepted_existing" | "duplicate_file" | "already_invited" | "failed";
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
      const toConfirm: Array<{
        resultIndex: number;
        email: string;
        firstName: string;
        token: string;
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
          const connection = await pool.getConnection();
          try {
            await connection.beginTransaction();
            const [accounts] = await connection.query<any[]>(
              `SELECT id, firstName, lastName, studyStatus, attestationUrl, phoneNumber,
                      email, isAmbassador, password, emailConfirmed, confirmationToken,
                      newsletterConsent
               FROM new_users WHERE email = ? LIMIT 1 FOR UPDATE`,
              [row.email],
            );
            const account = accounts[0];
            if (!account) {
              throw new Error("Le candidat ne possède pas de compte de connexion associé.");
            }

            const confirmation = account.emailConfirmed
              ? null
              : createImportedAccountConfirmationToken(row.email);
            if (confirmation) {
              await connection.execute(
                `UPDATE new_users SET confirmationToken = ? WHERE id = ?`,
                [confirmation.hash, account.id],
              );
            }

            const [candidateRows] = await connection.query<any[]>(
              `SELECT id FROM candidates WHERE email = ? LIMIT 1 FOR UPDATE`,
              [row.email],
            );
            if (candidateRows[0]) {
              await connection.execute(
                `UPDATE candidates
                 SET applicationStatus = 'accepted', emailConfirmed = ?, confirmationToken = ?
                 WHERE id = ?`,
                [account.emailConfirmed, confirmation?.hash ?? null, candidateRows[0].id],
              );
            } else {
              await connection.execute(
                `INSERT INTO candidates
                   (newUserId, firstName, lastName, studyStatus, attestationUrl, phoneNumber,
                    email, isAmbassador, password, emailConfirmed, confirmationToken,
                    newsletterConsent, applicationStatus, questionnaireAnswers, adminNote)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted', ?, ?)`,
                [
                  account.id,
                  account.firstName,
                  account.lastName,
                  account.studyStatus,
                  account.attestationUrl,
                  account.phoneNumber,
                  account.email,
                  account.isAmbassador,
                  account.password,
                  account.emailConfirmed,
                  confirmation?.hash ?? account.confirmationToken,
                  account.newsletterConsent,
                  JSON.stringify([]),
                  "Candidat accepté via l’import Excel.",
                ],
              );
            }
            await connection.execute(
              `UPDATE candidate_invitations SET status = 'revoked'
               WHERE email = ? AND status = 'pending'`,
              [row.email],
            );
            await connection.commit();

            const resultIndex = results.length;
            results.push({
              rowNumber: row.rowNumber,
              email: row.email,
              status: "accepted_existing",
              message: account.emailConfirmed
                ? "Compte existant marqué comme accepté. E-mail déjà confirmé."
                : "Compte existant marqué comme accepté. Confirmation à envoyer.",
            });
            if (confirmation) {
              toConfirm.push({
                resultIndex,
                email: row.email,
                firstName: account.firstName,
                token: confirmation.token,
              });
            }
          } catch (error) {
            await connection.rollback().catch(() => null);
            results.push({
              rowNumber: row.rowNumber,
              email: row.email,
              status: "failed",
              message: error instanceof Error ? error.message : "Impossible d’accepter le compte existant.",
            });
          } finally {
            connection.release();
          }
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

      await runWithConcurrency(toConfirm, 5, async (entry) => {
        const emailResult = await sendConfirmationEmail(
          entry.email,
          entry.firstName,
          entry.token,
          { reminder: true },
        );
        results[entry.resultIndex].message = emailResult.success
          ? "Compte existant marqué comme accepté et e-mail de confirmation envoyé."
          : "Compte existant marqué comme accepté, mais l’e-mail de confirmation a échoué.";
      });

      return {
        results: results.map(({ token: _token, expiresAt: _expiresAt, firstName: _firstName, ...result }) => result),
        createdCount: results.filter((result) => result.status === "created").length,
        acceptedExistingCount: results.filter((result) => result.status === "accepted_existing").length,
        emailSentCount: results.filter((result) => result.status === "created" && result.message.includes("envoyé")).length,
        confirmationEmailSentCount: results.filter(
          (result) => result.status === "accepted_existing" && result.message.includes("confirmation envoyé"),
        ).length,
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
        COUNT(DISTINCT CASE WHEN slots.status = 'scheduled' THEN slots.id END) AS scheduledSlots,
        COUNT(DISTINCT bookings.id) AS bookedInterviews
      FROM admin_users admins
      LEFT JOIN interview_candidate_assignments assignments ON assignments.adminId = admins.id
      LEFT JOIN interview_slots slots ON slots.createdByAdminId = admins.id
      LEFT JOIN interview_bookings bookings ON bookings.slotId = slots.id
      WHERE admins.role = 'interview_admin'
      GROUP BY admins.id, admins.name, admins.email, admins.isActive, admins.createdAt
      ORDER BY admins.createdAt DESC
    `);
    return rows.map((row) => ({
      ...row,
      assignedCandidates: Number(row.assignedCandidates),
      scheduledSlots: Number(row.scheduledSlots),
      bookedInterviews: Number(row.bookedInterviews),
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
             (SELECT COUNT(*) FROM interview_slots WHERE createdByAdminId = ? AND status = 'scheduled') AS scheduledSlots,
             (SELECT COUNT(*) FROM interview_transfer_requests
               WHERE status = 'pending' AND (fromAdminId = ? OR toAdminId = ?)) AS pendingTransfers`,
          [target.id, target.id, target.id, target.id],
        );
        const workload = workloadRows[0];
        if (Number(workload.assignments) > 0 || Number(workload.scheduledSlots) > 0 || Number(workload.pendingTransfers) > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Réattribuez d'abord ses ${workload.assignments} candidat(s), traitez ses ${workload.scheduledSlots} créneau(x) planifié(s) et ses ${workload.pendingTransfers} transfert(s) en attente.`,
          });
        }
      }
      await db.update(adminUsers).set({ isActive: input.isActive }).where(eq(adminUsers.id, target.id));
      return { success: true };
    }),

  deleteInterviewAdmin: superAdminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const connection = await getSqlPool().getConnection();
      try {
        await connection.beginTransaction();
        const [targets] = await connection.query<any[]>(
          "SELECT id, name FROM admin_users WHERE id = ? AND role = 'interview_admin' LIMIT 1 FOR UPDATE",
          [input.id],
        );
        const target = targets[0];
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Mini-admin introuvable." });
        }

        const [workloadRows] = await connection.query<any[]>(
          `SELECT
             (SELECT COUNT(*) FROM interview_candidate_assignments WHERE adminId = ?) AS assignments,
             (SELECT COUNT(*) FROM interview_slots WHERE createdByAdminId = ? AND status = 'scheduled') AS scheduledSlots,
             (SELECT COUNT(*)
                FROM interview_bookings bookings
                INNER JOIN interview_slots slots ON slots.id = bookings.slotId
               WHERE slots.createdByAdminId = ?) AS bookedInterviews,
             (SELECT COUNT(*) FROM interview_transfer_requests
               WHERE status = 'pending' AND (fromAdminId = ? OR toAdminId = ?)) AS pendingTransfers`,
          [target.id, target.id, target.id, target.id, target.id],
        );
        const workload = workloadRows[0];
        const assignments = Number(workload.assignments);
        const scheduledSlots = Number(workload.scheduledSlots);
        const bookedInterviews = Number(workload.bookedInterviews);
        const pendingTransfers = Number(workload.pendingTransfers);
        if (assignments > 0 || scheduledSlots > 0 || bookedInterviews > 0 || pendingTransfers > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Suppression impossible : ${assignments} candidat(s) affecté(s), ${scheduledSlots} créneau(x) planifié(s), ${bookedInterviews} entretien(s) réservé(s) et ${pendingTransfers} transfert(s) en attente. Traitez-les d’abord.`,
          });
        }

        // Keep historical audit entries and non-booked closed slots without retaining a dangling account id.
        await connection.query(
          "UPDATE interview_audit_logs SET actorAdminId = NULL WHERE actorAdminId = ?",
          [target.id],
        );
        await connection.query(
          "UPDATE interview_audit_logs SET targetAdminId = NULL WHERE targetAdminId = ?",
          [target.id],
        );
        await connection.query(
          "UPDATE interview_slots SET createdByAdminId = NULL WHERE createdByAdminId = ?",
          [target.id],
        );
        const [deleted] = await connection.execute<any>(
          "DELETE FROM admin_users WHERE id = ? AND role = 'interview_admin'",
          [target.id],
        );
        if (deleted.affectedRows !== 1) {
          throw new TRPCError({ code: "CONFLICT", message: "Le compte a été modifié. Actualisez la page." });
        }
        await connection.commit();
        return { success: true };
      } catch (error) {
        await connection.rollback().catch(() => null);
        throw error;
      } finally {
        connection.release();
      }
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

  listFinalAdmissionCandidates: superAdminQuery.query(async () => {
    const [rows] = await getSqlPool().query<any[]>(
      `SELECT c.id, c.firstName, c.lastName, c.email, c.phoneNumber,
              c.finalAdmissionStatus, c.finalAdmissionEmailSentAt, c.finalAdmissionEmailError,
              c.createdAt, c.updatedAt,
              b.recommendation, b.communicationScore, b.motivationScore,
              b.leadershipScore, b.evaluationNotes, b.evaluatedAt,
              s.status AS interviewStatus, s.startTime AS interviewDate,
              COALESCE(s.interviewerName, a.name) AS interviewerName
       FROM candidates c
       LEFT JOIN interview_bookings b ON b.candidateId = c.id
       LEFT JOIN interview_slots s ON s.id = b.slotId
       LEFT JOIN interview_candidate_assignments assignment ON assignment.candidateId = c.id
       LEFT JOIN admin_users a ON a.id = assignment.adminId
       WHERE c.applicationStatus = 'accepted'
       ORDER BY c.lastName, c.firstName, c.id`,
    );
    return rows.map((row) => ({
      ...row,
      id: Number(row.id),
      communicationScore: row.communicationScore === null ? null : Number(row.communicationScore),
      motivationScore: row.motivationScore === null ? null : Number(row.motivationScore),
      leadershipScore: row.leadershipScore === null ? null : Number(row.leadershipScore),
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
        finalAdmissionStatus: candidates.finalAdmissionStatus,
        finalAdmissionEmailSentAt: candidates.finalAdmissionEmailSentAt,
        finalAdmissionEmailError: candidates.finalAdmissionEmailError,
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

  acceptCandidatesByEmail: adminQuery
    .input(
      z.object({
        emails: z.array(z.string().email()).min(1).max(2000),
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const emails = [...new Set(input.emails.map((email) => email.trim().toLowerCase()))];
      const matched = await db
        .select({ email: candidates.email, applicationStatus: candidates.applicationStatus })
        .from(candidates)
        .where(inArray(candidates.email, emails));
      const matchedEmails = new Set(matched.map((candidate) => candidate.email.toLowerCase()));
      const emailsToAccept = matched
        .filter((candidate) => candidate.applicationStatus !== "accepted")
        .map((candidate) => candidate.email);

      if (emailsToAccept.length) {
        await db
          .update(candidates)
          .set({ applicationStatus: "accepted" } as any)
          .where(inArray(candidates.email, emailsToAccept));
      }

      return {
        acceptedCount: emailsToAccept.length,
        alreadyAcceptedCount: matched.length - emailsToAccept.length,
        notFound: emails.filter((email) => !matchedEmails.has(email)),
      };
    }),

  importFinalAdmittedCandidates: superAdminQuery
    .input(z.object({ emails: z.array(z.string().email()).min(1).max(2000) }))
    .mutation(async ({ input }) => {
      const emails = [...new Set(input.emails.map((email) => email.trim().toLowerCase()))];
      const connection = await getSqlPool().getConnection();
      try {
        await connection.beginTransaction();
        const [oralCandidates] = await connection.query<any[]>(
          `SELECT id, email, finalAdmissionEmailSentAt FROM candidates
           WHERE applicationStatus = 'accepted'
           ORDER BY id FOR UPDATE`,
        );
        const oralByEmail = new Map(
          oralCandidates.map((candidate) => [String(candidate.email).toLowerCase(), Number(candidate.id)]),
        );
        const admittedIds = emails
          .map((email) => oralByEmail.get(email))
          .filter((id): id is number => typeof id === "number");
        const notFoundOrIneligible = emails.filter((email) => !oralByEmail.has(email));
        if (!admittedIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Aucun e-mail du fichier ne correspond a un candidat de la phase orale.",
          });
        }
        const admittedIdSet = new Set(admittedIds);
        const alreadyNotifiedToRemove = oralCandidates.filter(
          (candidate) => candidate.finalAdmissionEmailSentAt && !admittedIdSet.has(Number(candidate.id)),
        );
        if (alreadyNotifiedToRemove.length) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Import bloque : ${alreadyNotifiedToRemove.length} candidat(s) ayant deja recu l'e-mail d'admission sont absents du fichier.`,
          });
        }

        if (admittedIds.length) {
          const placeholders = admittedIds.map(() => "?").join(",");
          await connection.query(
            `UPDATE candidates
             SET finalAdmissionStatus = 'not_admitted_after_interview',
                 finalAdmissionEmailSentAt = NULL, finalAdmissionEmailError = NULL
             WHERE applicationStatus = 'accepted' AND id NOT IN (${placeholders})`,
            admittedIds,
          );
          await connection.query(
            `UPDATE candidates
             SET finalAdmissionStatus = 'admitted', finalAdmissionEmailError = NULL
             WHERE id IN (${placeholders})`,
            admittedIds,
          );
        } else {
          await connection.query(
            `UPDATE candidates
             SET finalAdmissionStatus = 'not_admitted_after_interview',
                 finalAdmissionEmailSentAt = NULL, finalAdmissionEmailError = NULL
             WHERE applicationStatus = 'accepted'`,
          );
        }
        await connection.commit();
        return {
          admittedCount: admittedIds.length,
          notAdmittedAfterInterviewCount: oralCandidates.length - admittedIds.length,
          oralCandidateCount: oralCandidates.length,
          notFoundOrIneligible,
        };
      } catch (error) {
        await connection.rollback().catch(() => null);
        throw error;
      } finally {
        connection.release();
      }
    }),

  updateFinalAdmissionStatus: superAdminQuery
    .input(z.object({
      candidateId: z.number().int().positive(),
      status: z.enum(["pending", "admitted", "not_admitted_after_interview"]),
    }))
    .mutation(async ({ input }) => {
      const [rows] = await getSqlPool().query<any[]>(
        `SELECT applicationStatus, finalAdmissionStatus, finalAdmissionEmailSentAt
         FROM candidates WHERE id = ? LIMIT 1`,
        [input.candidateId],
      );
      const candidate = rows[0];
      if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "Candidat introuvable." });
      if (candidate.applicationStatus !== "accepted") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ce candidat n'a pas participe a la phase orale." });
      }
      if (candidate.finalAdmissionEmailSentAt && input.status !== "admitted") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "L'e-mail d'admission a deja ete envoye a ce candidat. Son statut ne peut plus etre retire.",
        });
      }
      await getSqlPool().execute(
        `UPDATE candidates
         SET finalAdmissionStatus = ?,
             finalAdmissionEmailSentAt = CASE WHEN ? = 'admitted' THEN finalAdmissionEmailSentAt ELSE NULL END,
             finalAdmissionEmailError = NULL
         WHERE id = ?`,
        [input.status, input.status, input.candidateId],
      );
      return { success: true };
    }),

  sendFinalAdmissionEmails: superAdminQuery.mutation(async () => {
    const connection = await getSqlPool().getConnection();
    let rows: any[] = [];
    try {
      await connection.beginTransaction();
      const [selectedRows] = await connection.query<any[]>(
        `SELECT id, firstName, email FROM candidates
         WHERE applicationStatus = 'accepted'
           AND finalAdmissionStatus = 'admitted'
           AND finalAdmissionEmailSentAt IS NULL
           AND (finalAdmissionEmailError IS NULL
             OR finalAdmissionEmailError <> 'SENDING'
             OR updatedAt < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 15 MINUTE))
         ORDER BY id FOR UPDATE`,
      );
      rows = selectedRows;
      if (rows.length) {
        const placeholders = rows.map(() => "?").join(",");
        await connection.query(
          `UPDATE candidates SET finalAdmissionEmailError = 'SENDING'
           WHERE id IN (${placeholders})`,
          rows.map((candidate) => candidate.id),
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback().catch(() => null);
      throw error;
    } finally {
      connection.release();
    }
    let sentCount = 0;
    let failedCount = 0;
    for (let index = 0; index < rows.length; index += 10) {
      const batch = rows.slice(index, index + 10);
      const results = await Promise.all(batch.map(async (candidate) => {
        const result = await sendCandidateFinalAdmissionEmail({
          to: String(candidate.email),
          firstName: String(candidate.firstName || ""),
        });
        await getSqlPool().execute(
          `UPDATE candidates SET finalAdmissionEmailSentAt = ?, finalAdmissionEmailError = ? WHERE id = ?`,
          [result.success ? new Date() : null, result.success ? null : String(result.reason || "SEND_FAILED").slice(0, 2000), candidate.id],
        );
        return result.success;
      }));
      sentCount += results.filter(Boolean).length;
      failedCount += results.filter((success) => !success).length;
    }
    return { targetedCount: rows.length, sentCount, failedCount };
  }),

  rejectAllPendingCandidates: superAdminQuery.mutation(async () => {
    const connection = await getSqlPool().getConnection();
    let pendingCandidates: Array<{ id: number; firstName: string; email: string }> = [];
    try {
      await connection.beginTransaction();
      const [rows] = await connection.query<any[]>(
        `SELECT id, firstName, email
         FROM candidates
         WHERE applicationStatus = 'pending'
         ORDER BY id
         FOR UPDATE`,
      );
      pendingCandidates = rows.map((row) => ({
        id: Number(row.id),
        firstName: String(row.firstName || ""),
        email: String(row.email || ""),
      }));
      if (pendingCandidates.length) {
        const placeholders = pendingCandidates.map(() => "?").join(",");
        await connection.query(
          `UPDATE candidates SET applicationStatus = 'rejected' WHERE id IN (${placeholders})`,
          pendingCandidates.map((candidate) => candidate.id),
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback().catch(() => null);
      throw error;
    } finally {
      connection.release();
    }

    let emailSentCount = 0;
    let emailFailedCount = 0;
    for (let index = 0; index < pendingCandidates.length; index += 10) {
      const batch = pendingCandidates.slice(index, index + 10);
      const results = await Promise.all(
        batch.map((candidate) => sendCandidateInitialRejectionEmail(candidate.email, candidate.firstName)),
      );
      emailSentCount += results.filter((result) => result.success).length;
      emailFailedCount += results.filter((result) => !result.success).length;
    }

    return {
      rejectedCount: pendingCandidates.length,
      emailSentCount,
      emailFailedCount,
    };
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
