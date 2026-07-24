import { z } from "zod";
import { and, asc, desc, eq, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  adminUsers,
  candidates,
  interviewBookings,
  interviewCandidateAssignments,
  interviewSlots,
} from "@db/schema";
import { createRouter, adminQuery, interviewAdminQuery, publicQuery } from "./middleware";
import { getDb, getSqlPool } from "./queries/connection";
import { requireCandidateSession } from "./candidate-auth-router";
import {
  createGoogleMeetEvent,
  deleteGoogleCalendarEvent,
  disconnectGoogleCalendarConnection,
  getGoogleCalendarConnectionStatus,
  inviteCandidateToGoogleEvent,
  removeCandidateFromGoogleEvent,
} from "./lib/google-calendar";

async function requireAcceptedCandidate(req: Request) {
  const session = requireCandidateSession(req.headers.get("cookie") || "");
  const db = getDb();
  const [candidate] = await db
    .select({ id: candidates.id, applicationStatus: candidates.applicationStatus })
    .from(candidates)
    .where(eq(candidates.newUserId, session.newUserId))
    .limit(1);

  if (!candidate || candidate.applicationStatus !== "accepted") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "La réservation des entretiens est réservée aux candidats acceptés.",
    });
  }

  return candidate;
}

async function cancelInterviewSlot(slotId: number) {
  const db = getDb();
  const [slot] = await db
    .select({ googleEventId: interviewSlots.googleEventId })
    .from(interviewSlots)
    .where(eq(interviewSlots.id, slotId))
    .limit(1);
  if (!slot) throw new TRPCError({ code: "NOT_FOUND", message: "Créneau introuvable." });

  try {
    if (slot.googleEventId) await deleteGoogleCalendarEvent(slot.googleEventId);
    await db.update(interviewSlots).set({
      status: "cancelled",
      calendarSyncStatus: "synced",
      calendarSyncError: null,
    }).where(eq(interviewSlots.id, slotId));
    return { success: true, calendarSynced: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur Google Calendar inconnue";
    console.error("[google-calendar] Event cancellation failed", message);
    await db.update(interviewSlots).set({
      status: "cancelled",
      calendarSyncStatus: "failed",
      calendarSyncError: message.slice(0, 2000),
    }).where(eq(interviewSlots.id, slotId));
    return { success: true, calendarSynced: false };
  }
}

export const interviewRouter = createRouter({
  candidateOverview: publicQuery.query(async ({ ctx }) => {
    const candidate = await requireAcceptedCandidate(ctx.req);
    const db = getDb();
    const now = new Date();
    const [assignments, ownBookings] = await Promise.all([
      db
        .select({ adminId: interviewCandidateAssignments.adminId })
        .from(interviewCandidateAssignments)
        .where(eq(interviewCandidateAssignments.candidateId, candidate.id))
        .limit(1),
      db
        .select({
          bookingId: interviewBookings.id,
          slotId: interviewSlots.id,
          startTime: interviewSlots.startTime,
          endTime: interviewSlots.endTime,
          meetingUrl: interviewSlots.meetingUrl,
          interviewerName: interviewSlots.interviewerName,
          status: interviewSlots.status,
        })
        .from(interviewBookings)
        .innerJoin(interviewSlots, eq(interviewBookings.slotId, interviewSlots.id))
        .where(eq(interviewBookings.candidateId, candidate.id))
        .limit(1),
    ]);
    const assignment = assignments[0];
    const ownBooking = ownBookings[0] ?? null;

    if (!assignment) {
      return { availableSlots: [], booking: ownBooking, awaitingAssignment: !ownBooking };
    }

    const [slots, bookings] = await Promise.all([
      db
        .select({
          id: interviewSlots.id,
          startTime: interviewSlots.startTime,
          endTime: interviewSlots.endTime,
          interviewerName: interviewSlots.interviewerName,
        })
        .from(interviewSlots)
        .where(and(
          eq(interviewSlots.status, "scheduled"),
          eq(interviewSlots.createdByAdminId, assignment.adminId),
        ))
        .orderBy(asc(interviewSlots.startTime)),
      db.select({ slotId: interviewBookings.slotId }).from(interviewBookings),
    ]);

    const bookedSlotIds = new Set(bookings.map((booking) => booking.slotId));
    const availableSlots = slots.filter(
      (slot) => slot.startTime > now && (!bookedSlotIds.has(slot.id) || slot.id === ownBooking?.slotId),
    );

    return { availableSlots, booking: ownBooking, awaitingAssignment: false };
  }),

  bookSlot: publicQuery
    .input(z.object({ slotId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const session = requireCandidateSession(ctx.req.headers.get("cookie") || "");
      const connection = await getSqlPool().getConnection();
      let committed = false;
      let calendarInviteSent = false;
      let calendarOperationStarted = false;
      let candidateEmail = "";
      let targetEventId: string | null = null;
      let previousEventId: string | null = null;
      let targetInvitationAdded = false;
      let previousInvitationRemoved = false;

      try {
        await connection.beginTransaction();
        const [candidateRows] = await connection.query<any[]>(
          "SELECT id, email, applicationStatus FROM candidates WHERE newUserId = ? LIMIT 1 FOR UPDATE",
          [session.newUserId],
        );
        const candidate = candidateRows[0];
        if (!candidate || candidate.applicationStatus !== "accepted") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "La réservation des entretiens est réservée aux candidats acceptés.",
          });
        }
        candidateEmail = candidate.email;

        const [assignmentRows] = await connection.query<any[]>(
          "SELECT adminId FROM interview_candidate_assignments WHERE candidateId = ? LIMIT 1 FOR UPDATE",
          [candidate.id],
        );
        const assignment = assignmentRows[0];
        if (!assignment) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Aucun responsable d'entretien ne vous a encore ete attribue.",
          });
        }

        const [slotRows] = await connection.query<any[]>(
          "SELECT id, startTime, status, googleEventId, createdByAdminId FROM interview_slots WHERE id = ? LIMIT 1 FOR UPDATE",
          [input.slotId],
        );
        const slot = slotRows[0];
        if (!slot || slot.status !== "scheduled" || new Date(slot.startTime).getTime() <= Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ce créneau n’est plus disponible." });
        }
        if (slot.createdByAdminId !== assignment.adminId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Ce creneau n'appartient pas a votre responsable d'entretien.",
          });
        }

        const [targetBookings] = await connection.query<any[]>(
          "SELECT id, candidateId FROM interview_bookings WHERE slotId = ? LIMIT 1 FOR UPDATE",
          [input.slotId],
        );
        if (targetBookings[0] && targetBookings[0].candidateId !== candidate.id) {
          throw new TRPCError({ code: "CONFLICT", message: "Ce créneau vient d’être réservé." });
        }

        const [ownBookings] = await connection.query<any[]>(
          `SELECT b.id, b.slotId, s.googleEventId
           FROM interview_bookings b
           INNER JOIN interview_slots s ON s.id = b.slotId
           WHERE b.candidateId = ? LIMIT 1 FOR UPDATE`,
          [candidate.id],
        );
        if (ownBookings[0]?.slotId !== input.slotId) {
          if (!slot.googleEventId) {
            throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Ce créneau n’est pas synchronisé avec Google Calendar." });
          }
          targetEventId = slot.googleEventId;
          previousEventId = ownBookings[0]?.googleEventId || null;
          calendarOperationStarted = true;
          await inviteCandidateToGoogleEvent(targetEventId, candidateEmail);
          targetInvitationAdded = true;
          if (previousEventId) {
            await removeCandidateFromGoogleEvent(previousEventId, candidateEmail);
            previousInvitationRemoved = true;
          }

          if (ownBookings[0]) {
            await connection.query("DELETE FROM interview_bookings WHERE id = ?", [ownBookings[0].id]);
          }
          await connection.query(
            "INSERT INTO interview_bookings (slotId, candidateId) VALUES (?, ?)",
            [input.slotId, candidate.id],
          );
          calendarInviteSent = true;
        }

        await connection.commit();
        committed = true;
      } catch (error) {
        if (!committed) await connection.rollback();
        if (!committed && previousInvitationRemoved && previousEventId && candidateEmail) {
          await inviteCandidateToGoogleEvent(previousEventId, candidateEmail).catch((compensationError) => {
            console.error("[google-calendar] Previous invitation restore failed", compensationError instanceof Error ? compensationError.message : compensationError);
          });
        }
        if (!committed && targetInvitationAdded && targetEventId && candidateEmail) {
          await removeCandidateFromGoogleEvent(targetEventId, candidateEmail).catch((compensationError) => {
            console.error("[google-calendar] Target invitation rollback failed", compensationError instanceof Error ? compensationError.message : compensationError);
          });
        }
        if (error instanceof TRPCError) throw error;
        if (calendarOperationStarted) {
          console.error("[google-calendar] Booking synchronization failed", error instanceof Error ? error.message : error);
          throw new TRPCError({
            code: "BAD_GATEWAY",
            message: "Google Calendar est temporairement indisponible. Votre ancien créneau a été conservé.",
          });
        }
        const mysqlError = error as { code?: string };
        if (mysqlError.code === "ER_DUP_ENTRY") {
          throw new TRPCError({ code: "CONFLICT", message: "Ce créneau vient d’être réservé." });
        }
        throw error;
      } finally {
        connection.release();
      }
      return { success: true, calendarInviteSent };
    }),

  adminGoogleStatus: interviewAdminQuery.query(async () => getGoogleCalendarConnectionStatus()),

  adminDisconnectGoogle: adminQuery.mutation(async () => disconnectGoogleCalendarConnection()),

  assignmentCandidates: interviewAdminQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        phoneNumber: candidates.phoneNumber,
        assignedAdminId: interviewCandidateAssignments.adminId,
        assignedAdminName: adminUsers.name,
        assignedAt: interviewCandidateAssignments.assignedAt,
        bookingId: interviewBookings.id,
      })
      .from(candidates)
      .leftJoin(
        interviewCandidateAssignments,
        eq(interviewCandidateAssignments.candidateId, candidates.id),
      )
      .leftJoin(adminUsers, eq(interviewCandidateAssignments.adminId, adminUsers.id))
      .leftJoin(interviewBookings, eq(interviewBookings.candidateId, candidates.id))
      .where(and(
        eq(candidates.applicationStatus, "accepted"),
        ctx.adminUser.role === "interview_admin"
          ? or(
            isNull(interviewCandidateAssignments.adminId),
            eq(interviewCandidateAssignments.adminId, ctx.adminUser.id),
          )
          : undefined,
      ))
      .orderBy(asc(candidates.firstName), asc(candidates.lastName));
  }),

  assignCandidates: interviewAdminQuery
    .input(z.object({
      candidateIds: z.array(z.number().int().positive()).min(1).max(100)
        .refine((ids) => new Set(ids).size === ids.length, "La selection contient des doublons."),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.adminUser.role !== "interview_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cette action est reservee aux mini-admins." });
      }

      const connection = await getSqlPool().getConnection();
      const placeholders = input.candidateIds.map(() => "?").join(",");
      try {
        await connection.beginTransaction();
        const [candidateRows] = await connection.query<any[]>(
          `SELECT id FROM candidates
           WHERE applicationStatus = 'accepted' AND id IN (${placeholders})
           FOR UPDATE`,
          input.candidateIds,
        );
        if (candidateRows.length !== input.candidateIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Un ou plusieurs candidats ne sont plus acceptes.",
          });
        }

        const [assignedRows] = await connection.query<any[]>(
          `SELECT candidateId FROM interview_candidate_assignments
           WHERE candidateId IN (${placeholders})
           FOR UPDATE`,
          input.candidateIds,
        );
        if (assignedRows.length) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Un candidat vient d'etre attribue a un autre mini-admin. Actualisez la liste.",
          });
        }

        const values = input.candidateIds.map(() => "(?, ?)").join(",");
        const params = input.candidateIds.flatMap((candidateId) => [candidateId, ctx.adminUser.id]);
        await connection.query(
          `INSERT INTO interview_candidate_assignments (candidateId, adminId) VALUES ${values}`,
          params,
        );
        await connection.commit();
        return { success: true, assignedCount: input.candidateIds.length };
      } catch (error) {
        await connection.rollback();
        if (error instanceof TRPCError) throw error;
        if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Un candidat vient d'etre attribue a un autre mini-admin. Actualisez la liste.",
          });
        }
        throw error;
      } finally {
        connection.release();
      }
    }),

  releaseCandidate: interviewAdminQuery
    .input(z.object({ candidateId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.adminUser.role !== "interview_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Cette action est reservee aux mini-admins." });
      }

      const connection = await getSqlPool().getConnection();
      try {
        await connection.beginTransaction();
        const [assignmentRows] = await connection.query<any[]>(
          `SELECT id, adminId FROM interview_candidate_assignments
           WHERE candidateId = ? LIMIT 1 FOR UPDATE`,
          [input.candidateId],
        );
        const assignment = assignmentRows[0];
        if (!assignment || assignment.adminId !== ctx.adminUser.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Cette affectation n'existe plus." });
        }

        const [bookingRows] = await connection.query<any[]>(
          "SELECT id FROM interview_bookings WHERE candidateId = ? LIMIT 1 FOR UPDATE",
          [input.candidateId],
        );
        if (bookingRows.length) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Ce candidat a deja reserve un creneau et ne peut plus etre libere.",
          });
        }

        await connection.query("DELETE FROM interview_candidate_assignments WHERE id = ?", [assignment.id]);
        await connection.commit();
        return { success: true };
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }),

  adminList: interviewAdminQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select({
        id: interviewSlots.id,
        startTime: interviewSlots.startTime,
        endTime: interviewSlots.endTime,
        meetingUrl: interviewSlots.meetingUrl,
        googleEventId: interviewSlots.googleEventId,
        interviewerName: interviewSlots.interviewerName,
        notes: interviewSlots.notes,
        calendarSyncStatus: interviewSlots.calendarSyncStatus,
        calendarSyncError: interviewSlots.calendarSyncError,
        createdByAdminId: interviewSlots.createdByAdminId,
        createdByAdminName: adminUsers.name,
        status: interviewSlots.status,
        bookingId: interviewBookings.id,
        candidateId: candidates.id,
        candidateFirstName: candidates.firstName,
        candidateLastName: candidates.lastName,
        candidateEmail: candidates.email,
        bookedAt: interviewBookings.bookedAt,
        communicationScore: interviewBookings.communicationScore,
        motivationScore: interviewBookings.motivationScore,
        leadershipScore: interviewBookings.leadershipScore,
        recommendation: interviewBookings.recommendation,
        evaluationNotes: interviewBookings.evaluationNotes,
        evaluatedAt: interviewBookings.evaluatedAt,
      })
      .from(interviewSlots)
      .leftJoin(interviewBookings, eq(interviewSlots.id, interviewBookings.slotId))
      .leftJoin(candidates, eq(interviewBookings.candidateId, candidates.id))
      .leftJoin(adminUsers, eq(interviewSlots.createdByAdminId, adminUsers.id))
      .where(
        ctx.adminUser.role === "interview_admin"
          ? eq(interviewSlots.createdByAdminId, ctx.adminUser.id)
          : undefined,
      )
      .orderBy(desc(interviewSlots.startTime));
    return rows.map((slot) => ({
      ...slot,
      isOwn: slot.createdByAdminId === ctx.adminUser.id,
      canDelete: ctx.adminUser.role !== "interview_admin" || slot.createdByAdminId === ctx.adminUser.id,
    }));
  }),

  createSlot: interviewAdminQuery
    .input(
      z.object({
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        interviewerName: z.string().trim().max(255).optional(),
        notes: z.string().trim().max(2000).optional(),
        repeatCount: z.number().int().min(1).max(30).default(1),
        gapMinutes: z.number().int().min(0).max(240).default(0),
        availabilityMode: z.boolean().default(false),
      }).refine((value) => value.endTime > value.startTime, {
        message: "L’heure de fin doit être après l’heure de début.",
        path: ["endTime"],
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.startTime.getTime() <= Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le premier créneau doit être dans le futur." });
      }
      if (input.availabilityMode && ctx.adminUser.role !== "interview_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Le mode disponibilite est reserve aux mini-admins." });
      }

      const availabilityDurationMs = input.endTime.getTime() - input.startTime.getTime();
      if (input.availabilityMode && availabilityDurationMs > 12 * 60 * 60 * 1000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Une disponibilite ne peut pas depasser 12 heures." });
      }

      const slotDurationMs = input.availabilityMode
        ? 30 * 60 * 1000
        : availabilityDurationMs;
      if (slotDurationMs < 5 * 60 * 1000 || slotDurationMs > 4 * 60 * 60 * 1000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La durée doit être comprise entre 5 minutes et 4 heures." });
      }

      const stepMs = slotDurationMs + input.gapMinutes * 60 * 1000;
      const generatedCount = input.availabilityMode
        ? Math.floor((availabilityDurationMs + input.gapMinutes * 60 * 1000) / stepMs)
        : input.repeatCount;
      if (generatedCount < 1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La disponibilite doit contenir au moins un creneau de 30 minutes." });
      }
      if (generatedCount > 30) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Une disponibilite ne peut pas generer plus de 30 creneaux." });
      }

      const planned = Array.from({ length: generatedCount }, (_, index) => {
        const offset = index * stepMs;
        return {
          startTime: new Date(input.startTime.getTime() + offset),
          endTime: new Date(input.startTime.getTime() + offset + slotDurationMs),
          interviewerName: ctx.adminUser.role === "interview_admin" ? ctx.adminUser.name : input.interviewerName,
          notes: input.notes,
        };
      });
      const connection = await getSqlPool().getConnection();
      const googleEvents: Array<{ eventId: string; meetingUrl: string }> = [];
      try {
        await connection.beginTransaction();
        for (const slot of planned) {
          const [overlaps] = await connection.query<any[]>(
            `SELECT id FROM interview_slots
             WHERE status = 'scheduled'
               AND startTime < ?
               AND endTime > ?
               AND (? = 0 OR createdByAdminId = ?)
             LIMIT 1 FOR UPDATE`,
            [
              slot.endTime,
              slot.startTime,
              ctx.adminUser.role === "interview_admin" ? 1 : 0,
              ctx.adminUser.id,
            ],
          );
          if (overlaps.length) {
            throw new TRPCError({ code: "CONFLICT", message: "Un créneau existe déjà sur cette période." });
          }
        }
        for (const slot of planned) googleEvents.push(await createGoogleMeetEvent(slot));
        for (let index = 0; index < planned.length; index += 1) {
          const slot = planned[index];
          const googleEvent = googleEvents[index];
          await connection.query(
            `INSERT INTO interview_slots
               (startTime, endTime, meetingUrl, googleEventId, interviewerName, notes, createdByAdminId, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`,
            [slot.startTime, slot.endTime, googleEvent.meetingUrl, googleEvent.eventId, slot.interviewerName || null, slot.notes || null, ctx.adminUser.id],
          );
        }
        await connection.commit();
      } catch (error) {
        await connection.rollback().catch(() => null);
        await Promise.all(googleEvents.map((event) => deleteGoogleCalendarEvent(event.eventId).catch(() => null)));
        throw error;
      } finally {
        connection.release();
      }
      return { success: true, createdCount: planned.length };
    }),

  updateSlotStatus: interviewAdminQuery
    .input(z.object({
      slotId: z.number().int().positive(),
      status: z.enum(["scheduled", "completed", "absent", "cancelled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [slot] = await db
        .select({
          googleEventId: interviewSlots.googleEventId,
          status: interviewSlots.status,
          createdByAdminId: interviewSlots.createdByAdminId,
        })
        .from(interviewSlots)
        .where(eq(interviewSlots.id, input.slotId))
        .limit(1);
      if (!slot) throw new TRPCError({ code: "NOT_FOUND", message: "Créneau introuvable." });
      if (ctx.adminUser.role === "interview_admin" && slot.createdByAdminId !== ctx.adminUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Vous pouvez modifier uniquement vos propres creneaux." });
      }
      if (input.status === "cancelled") return cancelInterviewSlot(input.slotId);
      await db.update(interviewSlots).set({ status: input.status }).where(eq(interviewSlots.id, input.slotId));
      return { success: true, calendarSynced: true };
    }),

  saveEvaluation: interviewAdminQuery
    .input(z.object({
      bookingId: z.number().int().positive(),
      communicationScore: z.number().int().min(1).max(5),
      motivationScore: z.number().int().min(1).max(5),
      leadershipScore: z.number().int().min(1).max(5),
      recommendation: z.enum(["pending", "accepted", "rejected"]),
      evaluationNotes: z.string().trim().max(5000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [booking] = await db
        .select({ createdByAdminId: interviewSlots.createdByAdminId })
        .from(interviewBookings)
        .innerJoin(interviewSlots, eq(interviewBookings.slotId, interviewSlots.id))
        .where(eq(interviewBookings.id, input.bookingId))
        .limit(1);
      if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Reservation introuvable." });
      if (ctx.adminUser.role === "interview_admin" && booking.createdByAdminId !== ctx.adminUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Vous pouvez evaluer uniquement vos propres entretiens." });
      }
      await db.update(interviewBookings).set({
        communicationScore: input.communicationScore,
        motivationScore: input.motivationScore,
        leadershipScore: input.leadershipScore,
        recommendation: input.recommendation,
        evaluationNotes: input.evaluationNotes || null,
        evaluatedAt: new Date(),
      }).where(eq(interviewBookings.id, input.bookingId));
      return { success: true };
    }),

  cancelSlot: adminQuery
    .input(z.object({ slotId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      return cancelInterviewSlot(input.slotId);
    }),

  deleteOwnSlot: interviewAdminQuery
    .input(z.object({ slotId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [slot] = await db
        .select({ createdByAdminId: interviewSlots.createdByAdminId, status: interviewSlots.status })
        .from(interviewSlots)
        .where(eq(interviewSlots.id, input.slotId))
        .limit(1);
      if (!slot) throw new TRPCError({ code: "NOT_FOUND", message: "Créneau introuvable." });
      if (ctx.adminUser.role === "interview_admin" && slot.createdByAdminId !== ctx.adminUser.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Vous pouvez supprimer uniquement vos propres créneaux." });
      }
      if (slot.status !== "scheduled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Seuls les créneaux planifiés peuvent être supprimés." });
      }
      const [booking] = await db
        .select({ id: interviewBookings.id })
        .from(interviewBookings)
        .where(eq(interviewBookings.slotId, input.slotId))
        .limit(1);
      const result = await cancelInterviewSlot(input.slotId);
      if (!booking) await db.delete(interviewSlots).where(eq(interviewSlots.id, input.slotId));
      return { ...result, deleted: !booking };
    }),

  retryCalendarSync: adminQuery
    .input(z.object({ slotId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const [slot] = await db
        .select({ status: interviewSlots.status })
        .from(interviewSlots)
        .where(eq(interviewSlots.id, input.slotId))
        .limit(1);
      if (!slot) throw new TRPCError({ code: "NOT_FOUND", message: "Créneau introuvable." });
      if (slot.status !== "cancelled") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Seules les annulations échouées peuvent être resynchronisées." });
      }
      return cancelInterviewSlot(input.slotId);
    }),
});
