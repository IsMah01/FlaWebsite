import { describe, expect, it } from "vitest";
import { isInterviewSlotBookable } from "./interview-booking-window";

const minute = 60 * 1000;
const now = Date.parse("2026-07-25T14:00:00Z");

describe("isInterviewSlotBookable", () => {
  it("allows a reservation exactly 15 minutes before", () => {
    expect(isInterviewSlotBookable(now + 15 * minute, now)).toBe(true);
  });

  it("rejects a reservation less than 15 minutes before", () => {
    expect(isInterviewSlotBookable(now + 15 * minute - 1, now)).toBe(false);
  });
});
