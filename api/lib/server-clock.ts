const configuredOffsetMinutes = Number(
  process.env.SERVER_CLOCK_OFFSET_MINUTES || "0",
);

const offsetMilliseconds = Number.isFinite(configuredOffsetMinutes)
  ? configuredOffsetMinutes * 60 * 1000
  : 0;

export function getServerNow() {
  return new Date(Date.now() + offsetMilliseconds);
}

export function getServerNowMilliseconds() {
  return Date.now() + offsetMilliseconds;
}
