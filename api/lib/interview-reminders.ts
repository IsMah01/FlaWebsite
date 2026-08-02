import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getSqlPool } from "../queries/connection";
import {
  sendInterviewAdminSlotReminderEmail,
  sendInterviewReminderEmail,
  sendInterviewUpdateEmail,
} from "./email";
import { getServerNow } from "./server-clock";
import { dueInterviewReminderType } from "./interview-reminder-windows";
import { MINIMUM_BOOKING_LEAD_TIME_MS } from "./interview-booking-window";
import { deleteGoogleCalendarEvent } from "./google-calendar";

type UpcomingInterview = RowDataPacket & {
  bookingId: number;
  firstName: string;
  email: string;
  startTime: Date;
  meetingUrl: string;
};

type CandidateWithoutBooking = RowDataPacket & {
  candidateId: number;
  adminId: number;
  firstName: string;
  email: string;
  adminName: string;
  adminEmail: string;
  adminPhoneNumber: string | null;
};

type BookingReminderHour = "10" | "18";

type AdminNeedingSlots = RowDataPacket & {
  adminId: number;
  adminName: string;
  email: string;
  unbookedCount: number | string;
  emptySlotCount: number | string;
};

type ExpiredUnbookedSlot = RowDataPacket & {
  id: number;
  googleEventId: string | null;
};

export async function deleteExpiredUnbookedInterviewSlots(now = getServerNow()) {
  const [slots] = await getSqlPool().execute<ExpiredUnbookedSlot[]>(
    `SELECT slot.id, slot.googleEventId
     FROM interview_slots slot
     LEFT JOIN interview_bookings booking ON booking.slotId = slot.id
     WHERE slot.status = 'scheduled'
       AND slot.endTime < ?
       AND booking.id IS NULL
     ORDER BY slot.endTime ASC
     LIMIT 100`,
    [now],
  );

  let deleted = 0;
  let failed = 0;
  for (const slot of slots) {
    try {
      if (slot.googleEventId) await deleteGoogleCalendarEvent(slot.googleEventId);
      const [result] = await getSqlPool().execute<ResultSetHeader>(
        `DELETE slot FROM interview_slots slot
         LEFT JOIN interview_bookings booking ON booking.slotId = slot.id
         WHERE slot.id = ?
           AND slot.status = 'scheduled'
           AND slot.endTime < ?
           AND booking.id IS NULL`,
        [slot.id, now],
      );
      deleted += result.affectedRows;
    } catch (error) {
      failed += 1;
      console.error("[interview-slot-cleanup] Slot cleanup failed:", slot.id, error instanceof Error ? error.message : error);
    }
  }
  return { eligible: slots.length, deleted, failed };
}

function bookingReminderClock(now: Date) {
  const timeZone = process.env.INTERVIEW_BOOKING_REMINDER_TIMEZONE || "Africa/Casablanca";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    hour: value("hour"),
  };
}

function configuredBookingReminderHours() {
  const configured = (process.env.INTERVIEW_BOOKING_REMINDER_HOURS || "10,18")
    .split(",")
    .map((hour) => hour.trim())
    .filter((hour): hour is BookingReminderHour => hour === "10" || hour === "18");
  return new Set<BookingReminderHour>(configured.length ? configured : ["10", "18"]);
}

export async function runInterviewBookingReminderJob(
  reminderDate: string,
  reminderHour: BookingReminderHour,
  now = getServerNow(),
) {
  const earliestBookableTime = new Date(now.getTime() + MINIMUM_BOOKING_LEAD_TIME_MS);
  const [rows] = await getSqlPool().execute<CandidateWithoutBooking[]>(
    `SELECT DISTINCT c.id AS candidateId, assignment.adminId, c.firstName, c.email,
            a.name AS adminName, a.email AS adminEmail, a.phoneNumber AS adminPhoneNumber
     FROM interview_candidate_assignments assignment
     INNER JOIN candidates c ON c.id = assignment.candidateId
     INNER JOIN admin_users a ON a.id = assignment.adminId AND a.isActive = true
     LEFT JOIN interview_bookings ownBooking ON ownBooking.candidateId = c.id
     LEFT JOIN interview_slots ownSlot ON ownSlot.id = ownBooking.slotId
     WHERE (ownBooking.id IS NULL OR ownSlot.status = 'cancelled')
       AND c.applicationStatus = 'accepted'
       AND c.emailConfirmed = true
       AND EXISTS (
         SELECT 1
         FROM interview_slots slot
         LEFT JOIN interview_bookings slotBooking ON slotBooking.slotId = slot.id
         WHERE slot.createdByAdminId = assignment.adminId
           AND slot.status = 'scheduled'
           AND slot.startTime >= ?
           AND slotBooking.id IS NULL
       )`,
    [earliestBookableTime],
  );

  let sent = 0;
  let failed = 0;
  for (const candidate of rows) {
    const [reserved] = await getSqlPool().execute<ResultSetHeader>(
      `INSERT IGNORE INTO interview_booking_reminder_emails
         (candidateId, email, reminderDate, reminderHour, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [candidate.candidateId, candidate.email, reminderDate, reminderHour],
    );
    if (reserved.affectedRows !== 1) continue;

    const checkTime = getServerNow();
    const [stillEligible] = await getSqlPool().execute<RowDataPacket[]>(
      `SELECT c.id
       FROM candidates c
       INNER JOIN interview_candidate_assignments assignment
         ON assignment.candidateId = c.id AND assignment.adminId = ?
       INNER JOIN admin_users a ON a.id = assignment.adminId AND a.isActive = true
       LEFT JOIN interview_bookings ownBooking ON ownBooking.candidateId = c.id
       LEFT JOIN interview_slots ownSlot ON ownSlot.id = ownBooking.slotId
       WHERE c.id = ?
         AND (ownBooking.id IS NULL OR ownSlot.status = 'cancelled')
         AND c.applicationStatus = 'accepted'
         AND c.emailConfirmed = true
         AND EXISTS (
           SELECT 1
           FROM interview_slots slot
           LEFT JOIN interview_bookings slotBooking ON slotBooking.slotId = slot.id
           WHERE slot.createdByAdminId = assignment.adminId
             AND slot.status = 'scheduled'
             AND slot.startTime >= ?
             AND slotBooking.id IS NULL
         )
       LIMIT 1`,
      [candidate.adminId, candidate.candidateId, new Date(checkTime.getTime() + MINIMUM_BOOKING_LEAD_TIME_MS)],
    );
    if (stillEligible.length !== 1) {
      await getSqlPool().execute(
        `DELETE FROM interview_booking_reminder_emails
         WHERE candidateId = ? AND reminderDate = ? AND reminderHour = ? AND status = 'pending'`,
        [candidate.candidateId, reminderDate, reminderHour],
      );
      continue;
    }

    const result = await sendInterviewUpdateEmail(candidate.email, candidate.firstName, "booking_reminder", {
      name: candidate.adminName,
      email: candidate.adminEmail,
      phoneNumber: candidate.adminPhoneNumber,
    });
    if (result.success) sent += 1;
    else failed += 1;
    await getSqlPool().execute(
      `UPDATE interview_booking_reminder_emails
       SET status = ?, sentAt = ?, errorMessage = ?
       WHERE candidateId = ? AND reminderDate = ? AND reminderHour = ?`,
      [
        result.success ? "sent" : "failed",
        result.success ? new Date() : null,
        result.success ? null : result.reason || "SEND_FAILED",
        candidate.candidateId,
        reminderDate,
        reminderHour,
      ],
    );
  }
  return { eligible: rows.length, sent, failed };
}

export async function runInterviewAdminSlotReminderJob(
  reminderDate: string,
  reminderHour: BookingReminderHour,
  now = getServerNow(),
) {
  const earliestBookableTime = new Date(now.getTime() + MINIMUM_BOOKING_LEAD_TIME_MS);
  const [rows] = await getSqlPool().execute<AdminNeedingSlots[]>(
    `SELECT capacity.*
     FROM (
       SELECT a.id AS adminId, a.name AS adminName, a.email,
         (SELECT COUNT(*)
          FROM interview_candidate_assignments assignment
          INNER JOIN candidates c ON c.id = assignment.candidateId
          LEFT JOIN interview_bookings booking ON booking.candidateId = c.id
          LEFT JOIN interview_slots bookedSlot ON bookedSlot.id = booking.slotId
          WHERE assignment.adminId = a.id
            AND c.applicationStatus = 'accepted'
            AND (booking.id IS NULL OR bookedSlot.status = 'cancelled')) AS unbookedCount,
         (SELECT COUNT(*)
          FROM interview_slots slot
          LEFT JOIN interview_bookings booking ON booking.slotId = slot.id
          WHERE slot.createdByAdminId = a.id
            AND slot.status = 'scheduled'
            AND slot.startTime >= ?
            AND booking.id IS NULL) AS emptySlotCount
       FROM admin_users a
       WHERE a.role = 'interview_admin' AND a.isActive = true
     ) capacity
     WHERE capacity.unbookedCount > 0
       AND capacity.emptySlotCount <= capacity.unbookedCount + 6`,
    [earliestBookableTime],
  );

  let sent = 0;
  let failed = 0;
  for (const admin of rows) {
    let unbookedCount = Number(admin.unbookedCount);
    let emptySlotCount = Number(admin.emptySlotCount);
    const [reserved] = await getSqlPool().execute<ResultSetHeader>(
      `INSERT IGNORE INTO interview_admin_slot_reminder_emails
         (adminId, email, reminderDate, reminderHour, unbookedCount, emptySlotCount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [admin.adminId, admin.email, reminderDate, reminderHour, unbookedCount, emptySlotCount],
    );
    if (reserved.affectedRows !== 1) continue;

    const adminCheckTime = getServerNow();
    const [currentCapacity] = await getSqlPool().execute<AdminNeedingSlots[]>(
      `SELECT capacity.*
       FROM (
         SELECT a.id AS adminId, a.name AS adminName, a.email,
           (SELECT COUNT(*)
            FROM interview_candidate_assignments assignment
            INNER JOIN candidates c ON c.id = assignment.candidateId
            LEFT JOIN interview_bookings booking ON booking.candidateId = c.id
            LEFT JOIN interview_slots bookedSlot ON bookedSlot.id = booking.slotId
            WHERE assignment.adminId = a.id
              AND c.applicationStatus = 'accepted'
              AND (booking.id IS NULL OR bookedSlot.status = 'cancelled')) AS unbookedCount,
           (SELECT COUNT(*)
            FROM interview_slots slot
            LEFT JOIN interview_bookings booking ON booking.slotId = slot.id
            WHERE slot.createdByAdminId = a.id
              AND slot.status = 'scheduled'
              AND slot.startTime >= ?
              AND booking.id IS NULL) AS emptySlotCount
         FROM admin_users a
         WHERE a.id = ? AND a.role = 'interview_admin' AND a.isActive = true
       ) capacity
       WHERE capacity.unbookedCount > 0
         AND capacity.emptySlotCount <= capacity.unbookedCount + 6`,
      [new Date(adminCheckTime.getTime() + MINIMUM_BOOKING_LEAD_TIME_MS), admin.adminId],
    );
    if (currentCapacity.length !== 1) {
      await getSqlPool().execute(
        `DELETE FROM interview_admin_slot_reminder_emails
         WHERE adminId = ? AND reminderDate = ? AND reminderHour = ? AND status = 'pending'`,
        [admin.adminId, reminderDate, reminderHour],
      );
      continue;
    }
    unbookedCount = Number(currentCapacity[0].unbookedCount);
    emptySlotCount = Number(currentCapacity[0].emptySlotCount);

    const result = await sendInterviewAdminSlotReminderEmail({
      to: currentCapacity[0].email,
      adminName: currentCapacity[0].adminName,
      unbookedCount,
      emptySlotCount,
    });
    if (result.success) sent += 1;
    else failed += 1;
    await getSqlPool().execute(
      `UPDATE interview_admin_slot_reminder_emails
       SET status = ?, sentAt = ?, errorMessage = ?, unbookedCount = ?, emptySlotCount = ?
       WHERE adminId = ? AND reminderDate = ? AND reminderHour = ?`,
      [
        result.success ? "sent" : "failed",
        result.success ? new Date() : null,
        result.success ? null : result.reason || "SEND_FAILED",
        unbookedCount,
        emptySlotCount,
        admin.adminId,
        reminderDate,
        reminderHour,
      ],
    );
  }
  return { eligible: rows.length, sent, failed };
}

async function reserveReminder(interview: UpcomingInterview, reminderType: "24h" | "1h") {
  const [retry] = await getSqlPool().execute<ResultSetHeader>(
    `UPDATE interview_reminder_emails
     SET status = 'pending', attemptCount = attemptCount + 1,
         errorMessage = NULL, nextAttemptAt = NULL
     WHERE bookingId = ? AND reminderType = ? AND status = 'failed'
       AND attemptCount < 3
       AND (nextAttemptAt IS NULL OR nextAttemptAt <= CURRENT_TIMESTAMP)`,
    [interview.bookingId, reminderType],
  );
  if (retry.affectedRows === 1) return true;

  const [created] = await getSqlPool().execute<ResultSetHeader>(
    `INSERT IGNORE INTO interview_reminder_emails
       (bookingId, reminderType, email, status, attemptCount, nextAttemptAt)
     VALUES (?, ?, ?, 'pending', 1, NULL)`,
    [interview.bookingId, reminderType, interview.email],
  );
  return created.affectedRows === 1;
}

async function finishReminder(
  bookingId: number,
  reminderType: "24h" | "1h",
  success: boolean,
  errorMessage?: string,
) {
  await getSqlPool().execute(
    `UPDATE interview_reminder_emails
     SET status = ?, sentAt = ?, errorMessage = ?,
         nextAttemptAt = CASE
           WHEN ? = false AND attemptCount < 3 THEN DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)
           ELSE NULL
         END
     WHERE bookingId = ? AND reminderType = ?`,
    [success ? "sent" : "failed", success ? new Date() : null, errorMessage || null, success, bookingId, reminderType],
  );
}

async function isReminderStillValid(bookingId: number, now: Date) {
  const [rows] = await getSqlPool().execute<RowDataPacket[]>(
    `SELECT b.id
     FROM interview_bookings b
     INNER JOIN interview_slots s ON s.id = b.slotId
     WHERE b.id = ? AND s.status = 'scheduled' AND s.startTime > ?
     LIMIT 1`,
    [bookingId, now],
  );
  return rows.length === 1;
}

export async function runInterviewReminderJob(now = getServerNow()) {
  const [rows] = await getSqlPool().execute<UpcomingInterview[]>(
    `SELECT b.id AS bookingId, c.firstName, c.email, s.startTime, s.meetingUrl
     FROM interview_bookings b
     INNER JOIN interview_slots s ON s.id = b.slotId
     INNER JOIN candidates c ON c.id = b.candidateId
     WHERE s.status = 'scheduled'
       AND s.startTime > ?
       AND s.startTime <= DATE_ADD(?, INTERVAL 1455 MINUTE)
     ORDER BY s.startTime ASC`,
    [now, now],
  );

  let sent = 0;
  let failed = 0;
  for (const interview of rows) {
    const millisecondsLeft = new Date(interview.startTime).getTime() - now.getTime();
    const reminderType = dueInterviewReminderType(millisecondsLeft);
    if (!reminderType) continue;
    if (!(await reserveReminder(interview, reminderType))) continue;
    if (!(await isReminderStillValid(interview.bookingId, now))) {
      await getSqlPool().execute(
        "DELETE FROM interview_reminder_emails WHERE bookingId = ? AND reminderType = ? AND status = 'pending'",
        [interview.bookingId, reminderType],
      );
      continue;
    }

    const result = await sendInterviewReminderEmail(
      interview.email,
      interview.firstName,
      new Date(interview.startTime),
      interview.meetingUrl,
      reminderType,
    );
    if (result.success) sent += 1;
    else failed += 1;
    await finishReminder(interview.bookingId, reminderType, result.success, result.reason);
  }
  return { eligible: rows.length, sent, failed };
}

export function startInterviewReminderScheduler() {
  const interviewRemindersEnabled = process.env.INTERVIEW_REMINDERS_ENABLED === "true";
  const bookingRemindersEnabled = process.env.INTERVIEW_BOOKING_REMINDERS_ENABLED === "true";
  const slotCleanupEnabled = process.env.INTERVIEW_EXPIRED_SLOT_CLEANUP_ENABLED !== "false";
  if (!interviewRemindersEnabled && !bookingRemindersEnabled && !slotCleanupEnabled) {
    console.log("[interview-reminders] Scheduler disabled.");
    return;
  }

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const now = getServerNow();
      if (slotCleanupEnabled) {
        const cleanup = await deleteExpiredUnbookedInterviewSlots(now);
        if (cleanup.deleted || cleanup.failed) console.log("[interview-slot-cleanup] Run complete:", cleanup);
      }
      if (interviewRemindersEnabled) {
        const result = await runInterviewReminderJob(now);
        if (result.sent || result.failed) console.log("[interview-reminders] Run complete:", result);
      }
      if (bookingRemindersEnabled) {
        const clock = bookingReminderClock(now);
        const hours = configuredBookingReminderHours();
        if (hours.has(clock.hour as BookingReminderHour)) {
          const result = await runInterviewBookingReminderJob(clock.date, clock.hour as BookingReminderHour, now);
          if (result.sent || result.failed) {
            console.log(`[interview-booking-reminders] ${clock.date} at ${clock.hour}:00:`, result);
          }
          const adminResult = await runInterviewAdminSlotReminderJob(
            clock.date,
            clock.hour as BookingReminderHour,
            now,
          );
          if (adminResult.sent || adminResult.failed) {
            console.log(`[interview-admin-slot-reminders] ${clock.date} at ${clock.hour}:00:`, adminResult);
          }
        }
      }
    } catch (error) {
      console.error("[interview-reminders] Run failed:", error);
    } finally {
      running = false;
    }
  };

  console.log("[interview-reminders] Scheduler ready: booked interviews at 24h and 1h.");
  if (slotCleanupEnabled) {
    console.log("[interview-slot-cleanup] Scheduler ready: expired unbooked slots are deleted automatically.");
  }
  if (bookingRemindersEnabled) {
    console.log("[interview-booking-reminders] Scheduler ready: 10:00 and 18:00 Africa/Casablanca.");
    console.log("[interview-admin-slot-reminders] Scheduler ready: capacity checks at 10:00 and 18:00.");
  }
  void tick();
  setInterval(() => void tick(), 60 * 1000);
}
