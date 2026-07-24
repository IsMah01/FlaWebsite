import { describe, expect, it } from "vitest";
import { buildAvailabilitySlots } from "./interview-slots";

describe("buildAvailabilitySlots", () => {
  it("creates four 30-minute slots in a two-hour window", () => {
    const slots = buildAvailabilitySlots(
      new Date("2026-07-24T17:00:00Z"),
      new Date("2026-07-24T19:00:00Z"),
      0,
    );
    expect(slots).toHaveLength(4);
    expect(slots[0].endTime.getTime() - slots[0].startTime.getTime()).toBe(30 * 60 * 1000);
  });

  it("places the configured pause between interviews", () => {
    const slots = buildAvailabilitySlots(
      new Date("2026-07-24T17:00:00Z"),
      new Date("2026-07-24T19:00:00Z"),
      10,
    );
    expect(slots).toHaveLength(3);
    expect(slots[1].startTime.getTime() - slots[0].endTime.getTime()).toBe(10 * 60 * 1000);
  });

  it("does not create a partial final slot", () => {
    const slots = buildAvailabilitySlots(
      new Date("2026-07-24T17:00:00Z"),
      new Date("2026-07-24T18:20:00Z"),
      0,
    );
    expect(slots).toHaveLength(2);
  });

  it("returns one extra item when the maximum would be exceeded", () => {
    const slots = buildAvailabilitySlots(
      new Date("2026-07-24T00:00:00Z"),
      new Date("2026-07-25T00:00:00Z"),
      0,
      30,
    );
    expect(slots).toHaveLength(31);
  });
});
