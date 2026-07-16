import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { adminUsers, candidates, interviewBookings, interviewSlots } from "@db/schema";
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

    const [slots, bookings, ownBookings] = await Promise.all([
      db
        .select({
          id: interviewSlots.id,
          startTime: interviewSlots.startTime,
          endTime: interviewSlots.endTime,
          interviewerName: interviewSlots.interviewerName,
        })
        .from(interviewSlots)
        .where(eq(interviewSlots.status, "scheduled"))
        .orderBy(asc(interviewSlots.startTime)),
      db.select({ slotId: interviewBookings.slotId }).from(interviewBookings),
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

    const bookedSlotIds = new Set(bookings.map((booking) => booking.slotId));
    const ownBooking = ownBookings[0] ?? null;
    const availableSlots = slots.filter(
      (slot) => slot.startTime > now && (!bookedSlotIds.has(slot.id) || slot.id === ownBooking?.slotId),
    );

    return { availableSlots, booking: ownBooking };
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

        const [slotRows] = await connection.query<any[]>(
          "SELECT id, startTime, status, googleEventId FROM interview_slots WHERE id = ? LIMIT 1 FOR UPDATE",
          [input.slotId],
        );
        const slot = slotRows[0];
        if (!slot || slot.status !== "scheduled" || new Date(slot.startTime).getTime() <= Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ce créneau n’est plus disponible." });
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

  acceptedCandidates: interviewAdminQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        id: candidates.id,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        phoneNumber: candidates.phoneNumber,
      })
      .from(candidates)
      .where(eq(candidates.applicationStatus, "accepted"))
      .orderBy(asc(candidates.firstName), asc(candidates.lastName));
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
      }).refine((value) => value.endTime > value.startTime, {
        message: "L’heure de fin doit être après l’heure de début.",
        path: ["endTime"],
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (input.startTime.getTime() <= Date.now()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Le premier créneau doit être dans le futur." });
      }
      const durationMs = input.endTime.getTime() - input.startTime.getTime();
      if (durationMs < 5 * 60 * 1000 || durationMs > 4 * 60 * 60 * 1000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "La durée doit être comprise entre 5 minutes et 4 heures." });
      }
      const planned = Array.from({ length: input.repeatCount }, (_, index) => {
        const offset = index * (durationMs + input.gapMinutes * 60 * 1000);
        return {
          startTime: new Date(input.startTime.getTime() + offset),
          endTime: new Date(input.endTime.getTime() + offset),
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
             WHERE status = 'scheduled' AND startTime < ? AND endTime > ?
             LIMIT 1 FOR UPDATE`,
            [slot.endTime, slot.startTime],
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

  updateSlotStatus: adminQuery
    .input(z.object({
      slotId: z.number().int().positive(),
      status: z.enum(["scheduled", "completed", "absent", "cancelled"]),
    }))
    .mutation(async ({ input }) => {
      if (input.status === "cancelled") return cancelInterviewSlot(input.slotId);
      const db = getDb();
      const [slot] = await db
        .select({ googleEventId: interviewSlots.googleEventId, status: interviewSlots.status })
        .from(interviewSlots)
        .where(eq(interviewSlots.id, input.slotId))
        .limit(1);
      if (!slot) throw new TRPCError({ code: "NOT_FOUND", message: "Créneau introuvable." });
      await db.update(interviewSlots).set({ status: input.status }).where(eq(interviewSlots.id, input.slotId));
      return { success: true, calendarSynced: true };
    }),

  saveEvaluation: adminQuery
    .input(z.object({
      bookingId: z.number().int().positive(),
      communicationScore: z.number().int().min(1).max(5),
      motivationScore: z.number().int().min(1).max(5),
      leadershipScore: z.number().int().min(1).max(5),
      recommendation: z.enum(["pending", "accepted", "rejected"]),
      evaluationNotes: z.string().trim().max(5000).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
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
