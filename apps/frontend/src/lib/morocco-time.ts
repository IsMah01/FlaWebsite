export const MOROCCO_TIME_ZONE = "Africa/Casablanca";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-MA", {
  timeZone: MOROCCO_TIME_ZONE,
  dateStyle: "short",
  timeStyle: "medium",
});

const timeFormatter = new Intl.DateTimeFormat("fr-MA", {
  timeZone: MOROCCO_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

export function formatMoroccoDateTime(value: string | number | Date) {
  return dateTimeFormatter.format(new Date(value));
}

export function formatMoroccoTime(value: string | number | Date) {
  return timeFormatter.format(new Date(value));
}
