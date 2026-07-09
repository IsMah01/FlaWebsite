export const REGISTRATION_DEADLINE = "2026-07-17";
export const REGISTRATION_DEADLINE_LABEL = "17/07/2026";
export const REGISTRATION_DEADLINE_AR = "17 يوليوز 2026";

export function getRegistrationCountdownDays() {
  const target = new Date(`${REGISTRATION_DEADLINE}T00:00:00`);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = target.getTime() - startOfToday.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
