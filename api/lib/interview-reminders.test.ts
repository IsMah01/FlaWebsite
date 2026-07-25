import { describe, expect, it } from "vitest";
import { dueInterviewReminderType } from "./interview-reminder-windows";

const minute = 60 * 1000;
const hour = 60 * minute;

describe("dueInterviewReminderType", () => {
  it("does not send a one-hour reminder for a booking made 15 minutes before", () => {
    expect(dueInterviewReminderType(15 * minute)).toBeNull();
  });

  it("sends the one-hour reminder close to one hour before", () => {
    expect(dueInterviewReminderType(55 * minute)).toBe("1h");
  });

  it("sends the 24-hour reminder close to one day before", () => {
    expect(dueInterviewReminderType(23 * hour + 55 * minute)).toBe("24h");
  });

  it("does not send reminders outside their intended windows", () => {
    expect(dueInterviewReminderType(2 * hour)).toBeNull();
  });
});
