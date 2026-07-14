import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { getSqlPool } from "../queries/connection";
import { sendCandidateQuestionnaireReminderEmail, sendConfirmationEmail } from "./email";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_DEADLINE = "2026-07-17";
const DEFAULT_SEND_HOUR = 13;
const DEFAULT_TIMEZONE = "Africa/Casablanca";

type ReminderCandidate = RowDataPacket & {
  id: number;
  firstName: string;
  email: string;
};

type ZonedNow = {
  dateKey: string;
  hour: number;
  minute: number;
};

function getReminderConfig() {
  return {
    enabled: process.env.CANDIDATE_REMINDERS_ENABLED !== "false",
    deadline: process.env.CANDIDATE_FORM_DEADLINE || DEFAULT_DEADLINE,
    sendHour: Number(process.env.CANDIDATE_REMINDER_SEND_HOUR || DEFAULT_SEND_HOUR),
    timezone: process.env.CANDIDATE_REMINDER_TIMEZONE || DEFAULT_TIMEZONE,
  };
}

function getZonedNow(timezone: string, now = new Date()): ZonedNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dateKey: `${byType.year}-${byType.month}-${byType.day}`,
    hour: Number(byType.hour),
    minute: Number(byType.minute),
  };
}

function parseDateKey(dateKey: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    throw new Error(`Invalid date format: ${dateKey}. Expected YYYY-MM-DD.`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function daysUntil(deadline: string, today: string) {
  const deadlineParts = parseDateKey(deadline);
  const todayParts = parseDateKey(today);
  const deadlineUtc = Date.UTC(deadlineParts.year, deadlineParts.month - 1, deadlineParts.day);
  const todayUtc = Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day);
  return Math.ceil((deadlineUtc - todayUtc) / MS_PER_DAY);
}

function formatDeadlineLabel(deadline: string) {
  const { year, month, day } = parseDateKey(deadline);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

async function reserveDailyReminder(
  candidate: ReminderCandidate,
  reminderDate: string,
  daysLeft: number,
) {
  const [result] = await getSqlPool().execute<ResultSetHeader>(
    `INSERT IGNORE INTO candidate_reminder_emails
       (newUserId, email, reminderDate, daysLeft, status)
     VALUES (?, ?, ?, ?, 'pending')`,
    [candidate.id, candidate.email, reminderDate, daysLeft],
  );

  return result.affectedRows === 1;
}

async function markDailyReminderSent(newUserId: number, reminderDate: string) {
  await getSqlPool().execute(
    `UPDATE candidate_reminder_emails
     SET status = 'sent', sentAt = NOW(), errorMessage = NULL
     WHERE newUserId = ? AND reminderDate = ?`,
    [newUserId, reminderDate],
  );
}

async function markDailyReminderFailed(
  newUserId: number,
  reminderDate: string,
  errorMessage: string,
) {
  await getSqlPool().execute(
    `UPDATE candidate_reminder_emails
     SET status = 'failed', errorMessage = ?
     WHERE newUserId = ? AND reminderDate = ?`,
    [errorMessage.slice(0, 1000), newUserId, reminderDate],
  );
}

async function getPendingQuestionnaireUsers() {
  const [rows] = await getSqlPool().execute<ReminderCandidate[]>(
    `SELECT nu.id, nu.firstName, nu.email
     FROM new_users nu
     LEFT JOIN candidates c ON c.newUserId = nu.id
     WHERE c.id IS NULL
       AND nu.emailConfirmed = true
     ORDER BY nu.id ASC`,
  );

  return rows;
}

async function getUnconfirmedUsers() {
  const [rows] = await getSqlPool().execute<ReminderCandidate[]>(
    `SELECT id, firstName, email
     FROM new_users
     WHERE emailConfirmed = false
     ORDER BY id ASC`,
  );

  return rows;
}

async function reserveDailyConfirmationReminder(
  candidate: ReminderCandidate,
  reminderDate: string,
) {
  const [result] = await getSqlPool().execute<ResultSetHeader>(
    `INSERT IGNORE INTO candidate_confirmation_reminder_emails
       (newUserId, email, reminderDate, status)
     VALUES (?, ?, ?, 'pending')`,
    [candidate.id, candidate.email, reminderDate],
  );

  return result.affectedRows === 1;
}

function createConfirmationReminderToken(email: string) {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET is required to create email confirmation reminders");
  }

  const token = jwt.sign(
    { email, nonce: crypto.randomBytes(16).toString("hex") },
    secret,
    { expiresIn: "24h" },
  );

  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
  };
}

async function saveConfirmationReminderToken(newUserId: number, tokenHash: string) {
  const [result] = await getSqlPool().execute<ResultSetHeader>(
    `UPDATE new_users
     SET confirmationToken = ?
     WHERE id = ? AND emailConfirmed = false`,
    [tokenHash, newUserId],
  );

  return result.affectedRows === 1;
}

async function markDailyConfirmationReminderSent(newUserId: number, reminderDate: string) {
  await getSqlPool().execute(
    `UPDATE candidate_confirmation_reminder_emails
     SET status = 'sent', sentAt = NOW(), errorMessage = NULL
     WHERE newUserId = ? AND reminderDate = ?`,
    [newUserId, reminderDate],
  );
}

async function markDailyConfirmationReminderFailed(
  newUserId: number,
  reminderDate: string,
  errorMessage: string,
) {
  await getSqlPool().execute(
    `UPDATE candidate_confirmation_reminder_emails
     SET status = 'failed', errorMessage = ?
     WHERE newUserId = ? AND reminderDate = ?`,
    [errorMessage.slice(0, 1000), newUserId, reminderDate],
  );
}

export async function runCandidateQuestionnaireReminderJob(now = new Date()) {
  const config = getReminderConfig();
  if (!config.enabled) {
    return { skipped: true, reason: "disabled" };
  }

  const zonedNow = getZonedNow(config.timezone, now);
  const daysLeft = daysUntil(config.deadline, zonedNow.dateKey);

  if (daysLeft <= 0) {
    return { skipped: true, reason: "deadline_reached", date: zonedNow.dateKey };
  }

  const users = await getPendingQuestionnaireUsers();
  const unconfirmedUsers = await getUnconfirmedUsers();
  const deadlineLabel = formatDeadlineLabel(config.deadline);
  let sent = 0;
  let failed = 0;
  let skippedAlreadyReserved = 0;
  let confirmationSent = 0;
  let confirmationFailed = 0;
  let confirmationSkippedAlreadyReserved = 0;

  for (const user of users) {
    const reserved = await reserveDailyReminder(user, zonedNow.dateKey, daysLeft);
    if (!reserved) {
      skippedAlreadyReserved += 1;
      continue;
    }

    const result = await sendCandidateQuestionnaireReminderEmail(
      user.email,
      user.firstName,
      daysLeft,
      deadlineLabel,
    );

    if (result.success) {
      sent += 1;
      await markDailyReminderSent(user.id, zonedNow.dateKey);
    } else {
      failed += 1;
      await markDailyReminderFailed(user.id, zonedNow.dateKey, result.reason || "SEND_FAILED");
    }
  }

  for (const user of unconfirmedUsers) {
    const reserved = await reserveDailyConfirmationReminder(user, zonedNow.dateKey);
    if (!reserved) {
      confirmationSkippedAlreadyReserved += 1;
      continue;
    }

    const confirmation = createConfirmationReminderToken(user.email);
    const tokenSaved = await saveConfirmationReminderToken(user.id, confirmation.tokenHash);
    if (!tokenSaved) {
      confirmationFailed += 1;
      await markDailyConfirmationReminderFailed(user.id, zonedNow.dateKey, "ALREADY_CONFIRMED");
      continue;
    }

    const result = await sendConfirmationEmail(
      user.email,
      user.firstName,
      confirmation.token,
      { reminder: true },
    );

    if (result.success) {
      confirmationSent += 1;
      await markDailyConfirmationReminderSent(user.id, zonedNow.dateKey);
    } else {
      confirmationFailed += 1;
      await markDailyConfirmationReminderFailed(
        user.id,
        zonedNow.dateKey,
        result.reason || "SEND_FAILED",
      );
    }
  }

  return {
    skipped: false,
    date: zonedNow.dateKey,
    daysLeft,
    totalEligible: users.length,
    sent,
    failed,
    skippedAlreadyReserved,
    confirmationTotalEligible: unconfirmedUsers.length,
    confirmationSent,
    confirmationFailed,
    confirmationSkippedAlreadyReserved,
  };
}

export function startCandidateQuestionnaireReminderScheduler() {
  const config = getReminderConfig();
  if (!config.enabled) {
    console.log("[candidate-reminders] Scheduler disabled.");
    return;
  }

  let lastRunDate: string | null = null;

  const tick = async () => {
    const currentConfig = getReminderConfig();
    if (!currentConfig.enabled) return;

    const zonedNow = getZonedNow(currentConfig.timezone);
    const isSendWindow = zonedNow.hour === currentConfig.sendHour && zonedNow.minute < 5;
    if (!isSendWindow || lastRunDate === zonedNow.dateKey) {
      return;
    }

    lastRunDate = zonedNow.dateKey;
    try {
      const result = await runCandidateQuestionnaireReminderJob();
      console.log("[candidate-reminders] Run complete:", result);
    } catch (error) {
      lastRunDate = null;
      console.error("[candidate-reminders] Run failed:", error);
    }
  };

  console.log(
    `[candidate-reminders] Scheduler ready: ${config.sendHour}:00 ${config.timezone}, deadline ${config.deadline}.`,
  );
  void tick();
  setInterval(() => {
    void tick();
  }, 60 * 1000);
}
