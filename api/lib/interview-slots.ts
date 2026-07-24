export function buildAvailabilitySlots(
  startTime: Date,
  endTime: Date,
  gapMinutes: number,
  maxSlots = 30,
) {
  const slotDurationMs = 30 * 60 * 1000;
  const stepMs = slotDurationMs + gapMinutes * 60 * 1000;
  const windowMs = endTime.getTime() - startTime.getTime();
  const count = Math.floor((windowMs + gapMinutes * 60 * 1000) / stepMs);

  return Array.from({ length: Math.min(Math.max(0, count), maxSlots + 1) }, (_, index) => {
    const start = new Date(startTime.getTime() + index * stepMs);
    return { startTime: start, endTime: new Date(start.getTime() + slotDurationMs) };
  });
}
