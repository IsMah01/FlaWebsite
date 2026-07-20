const ORIGINAL_DEADLINE = "2026-07-17";
const EXTENDED_DEADLINE = "2026-07-20";
const EXTENSION_ANNOUNCEMENT_DATE = "2026-07-18";

function getMoroccoDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export const IS_REGISTRATION_EXTENSION_ACTIVE = getMoroccoDateKey() >= EXTENSION_ANNOUNCEMENT_DATE;
export const REGISTRATION_DEADLINE = IS_REGISTRATION_EXTENSION_ACTIVE ? EXTENDED_DEADLINE : ORIGINAL_DEADLINE;
export const REGISTRATION_DEADLINE_LABEL = IS_REGISTRATION_EXTENSION_ACTIVE ? "20/07/2026" : "17/07/2026";
export const REGISTRATION_DEADLINE_AR = IS_REGISTRATION_EXTENSION_ACTIVE ? "20 يوليوز 2026" : "17 يوليوز 2026";

export function isRegistrationClosed() {
  return getMoroccoDateKey() > REGISTRATION_DEADLINE;
}

export function getRegistrationCountdownDays() {
  const deadline = new Date(`${REGISTRATION_DEADLINE}T00:00:00Z`).getTime();
  const today = new Date(`${getMoroccoDateKey()}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((deadline - today) / (1000 * 60 * 60 * 24)) + 1);
}
