export type TransferOverlap = {
  id: number;
  bookingId: number | null;
};

export function classifyTransferOverlaps(overlaps: TransferOverlap[]) {
  return {
    hasBookedConflict: overlaps.some((overlap) => overlap.bookingId !== null),
    emptySlotIds: overlaps
      .filter((overlap) => overlap.bookingId === null)
      .map((overlap) => overlap.id),
  };
}
