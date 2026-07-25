const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

export function dueInterviewReminderType(millisecondsLeft: number): "24h" | "1h" | null {
  if (millisecondsLeft >= 23.75 * HOUR_MS && millisecondsLeft <= 24.25 * HOUR_MS) {
    return "24h";
  }
  if (millisecondsLeft >= 45 * MINUTE_MS && millisecondsLeft <= 65 * MINUTE_MS) {
    return "1h";
  }
  return null;
}
