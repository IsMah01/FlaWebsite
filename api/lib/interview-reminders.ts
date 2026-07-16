import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getSqlPool } from "../queries/connection";
import { sendInterviewReminderEmail } from "./email";

type UpcomingInterview = RowDataPacket & {
  bookingId: number;
  firstName: string;
  email: string;
  startTime: Date;
  meetingUrl: string;
};

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

export async function runInterviewReminderJob(now = new Date()) {
  const [rows] = await getSqlPool().execute<UpcomingInterview[]>(
    `SELECT b.id AS bookingId, c.firstName, c.email, s.startTime, s.meetingUrl
     FROM interview_bookings b
     INNER JOIN interview_slots s ON s.id = b.slotId
     INNER JOIN candidates c ON c.id = b.candidateId
     WHERE s.status = 'scheduled'
       AND s.startTime > ?
       AND s.startTime <= DATE_ADD(?, INTERVAL 24 HOUR)
     ORDER BY s.startTime ASC`,
    [now, now],
  );

  let sent = 0;
  let failed = 0;
  for (const interview of rows) {
    const millisecondsLeft = new Date(interview.startTime).getTime() - now.getTime();
    const reminderType = millisecondsLeft <= 60 * 60 * 1000 ? "1h" : "24h";
    if (!(await reserveReminder(interview, reminderType))) continue;

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
  if (process.env.INTERVIEW_REMINDERS_ENABLED === "false") {
    console.log("[interview-reminders] Scheduler disabled.");
    return;
  }

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runInterviewReminderJob();
      if (result.sent || result.failed) console.log("[interview-reminders] Run complete:", result);
    } catch (error) {
      console.error("[interview-reminders] Run failed:", error);
    } finally {
      running = false;
    }
  };

  console.log("[interview-reminders] Scheduler ready: 24h and 1h before interviews.");
  void tick();
  setInterval(() => void tick(), 60 * 1000);
}
