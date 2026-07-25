export const MINIMUM_BOOKING_LEAD_TIME_MS = 15 * 60 * 1000;

export function isInterviewSlotBookable(startTimeMs: number, nowMs: number) {
  return startTimeMs - nowMs >= MINIMUM_BOOKING_LEAD_TIME_MS;
}
