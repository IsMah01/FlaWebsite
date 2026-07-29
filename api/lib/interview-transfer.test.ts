import { describe, expect, it } from "vitest";
import { classifyTransferOverlaps } from "./interview-transfer";

describe("interview transfer conflicts", () => {
  it("allows a transfer when there is no overlapping slot", () => {
    expect(classifyTransferOverlaps([])).toEqual({
      hasBookedConflict: false,
      emptySlotIds: [],
    });
  });

  it("allows a transfer and identifies all empty overlapping slots", () => {
    expect(classifyTransferOverlaps([
      { id: 11, bookingId: null },
      { id: 12, bookingId: null },
    ])).toEqual({
      hasBookedConflict: false,
      emptySlotIds: [11, 12],
    });
  });

  it("blocks acceptance when an overlapping slot is booked", () => {
    expect(classifyTransferOverlaps([{ id: 21, bookingId: 7 }])).toEqual({
      hasBookedConflict: true,
      emptySlotIds: [],
    });
  });

  it("keeps empty slots identifiable while a booked conflict blocks acceptance", () => {
    expect(classifyTransferOverlaps([
      { id: 31, bookingId: null },
      { id: 32, bookingId: 9 },
    ])).toEqual({
      hasBookedConflict: true,
      emptySlotIds: [31],
    });
  });
});
