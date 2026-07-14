import { z } from "zod";
import { asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { candidates, interviewBookings, interviewSlots } from "@db/schema";
import { createRouter, adminQuery, publicQuery } from "./middleware";
import { getDb, getSqlPool } from "./queries/connection";
import { requireCandidateSession } from "./candidate-auth-router";

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
        .where(eq(interviewSlots.status, "active"))
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

      try {
        await connection.beginTransaction();
        const [candidateRows] = await connection.query<any[]>(
          "SELECT id, applicationStatus FROM candidates WHERE newUserId = ? LIMIT 1 FOR UPDATE",
          [session.newUserId],
        );
        const candidate = candidateRows[0];
        if (!candidate || candidate.applicationStatus !== "accepted") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "La réservation des entretiens est réservée aux candidats acceptés.",
          });
        }

        const [slotRows] = await connection.query<any[]>(
          "SELECT id, startTime, status FROM interview_slots WHERE id = ? LIMIT 1 FOR UPDATE",
          [input.slotId],
        );
        const slot = slotRows[0];
        if (!slot || slot.status !== "active" || new Date(slot.startTime).getTime() <= Date.now()) {
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
          "SELECT id, slotId FROM interview_bookings WHERE candidateId = ? LIMIT 1 FOR UPDATE",
          [candidate.id],
        );
        if (ownBookings[0]?.slotId !== input.slotId) {
          if (ownBookings[0]) {
            await connection.query("DELETE FROM interview_bookings WHERE id = ?", [ownBookings[0].id]);
          }
          await connection.query(
            "INSERT INTO interview_bookings (slotId, candidateId) VALUES (?, ?)",
            [input.slotId, candidate.id],
          );
        }

        await connection.commit();
        return { success: true };
      } catch (error) {
        await connection.rollback();
        if (error instanceof TRPCError) throw error;
        const mysqlError = error as { code?: string };
        if (mysqlError.code === "ER_DUP_ENTRY") {
          throw new TRPCError({ code: "CONFLICT", message: "Ce créneau vient d’être réservé." });
        }
        throw error;
      } finally {
        connection.release();
      }
    }),

  adminList: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        id: interviewSlots.id,
        startTime: interviewSlots.startTime,
        endTime: interviewSlots.endTime,
        meetingUrl: interviewSlots.meetingUrl,
        interviewerName: interviewSlots.interviewerName,
        notes: interviewSlots.notes,
        status: interviewSlots.status,
        bookingId: interviewBookings.id,
        candidateId: candidates.id,
        candidateFirstName: candidates.firstName,
        candidateLastName: candidates.lastName,
        candidateEmail: candidates.email,
        bookedAt: interviewBookings.bookedAt,
      })
      .from(interviewSlots)
      .leftJoin(interviewBookings, eq(interviewSlots.id, interviewBookings.slotId))
      .leftJoin(candidates, eq(interviewBookings.candidateId, candidates.id))
      .orderBy(desc(interviewSlots.startTime));
  }),

  createSlot: adminQuery
    .input(
      z.object({
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
        meetingUrl: z.string().url().max(2000),
        interviewerName: z.string().trim().max(255).optional(),
        notes: z.string().trim().max(2000).optional(),
      }).refine((value) => value.endTime > value.startTime, {
        message: "L’heure de fin doit être après l’heure de début.",
        path: ["endTime"],
      }),
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(interviewSlots).values({
        startTime: input.startTime,
        endTime: input.endTime,
        meetingUrl: input.meetingUrl,
        interviewerName: input.interviewerName || null,
        notes: input.notes || null,
      });
      return { success: true };
    }),

  cancelSlot: adminQuery
    .input(z.object({ slotId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(interviewSlots).set({ status: "cancelled" }).where(eq(interviewSlots.id, input.slotId));
      return { success: true };
    }),
});
