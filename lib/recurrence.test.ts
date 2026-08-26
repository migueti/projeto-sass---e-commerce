import { describe, expect, it } from "vitest";

import { getNextRecurrenceDate } from "@/lib/recurrence";

const date = (value: string) => new Date(`${value}T12:00:00`);

describe("getNextRecurrenceDate", () => {
  it("keeps monthly schedules on the last day of the month", () => {
    expect(getNextRecurrenceDate(date("2026-01-31"), "MONTHLY")).toEqual(
      date("2026-02-28"),
    );
    expect(getNextRecurrenceDate(date("2026-02-28"), "MONTHLY")).toEqual(
      date("2026-03-31"),
    );
  });

  it("handles leap years and weekly schedules", () => {
    expect(getNextRecurrenceDate(date("2028-01-31"), "MONTHLY")).toEqual(
      date("2028-02-29"),
    );
    expect(getNextRecurrenceDate(date("2026-03-15"), "WEEKLY")).toEqual(
      date("2026-03-22"),
    );
  });

  it("clamps regular dates when the next month is shorter", () => {
    expect(getNextRecurrenceDate(date("2026-01-30"), "MONTHLY")).toEqual(
      date("2026-02-28"),
    );
  });

  it("returns to the scheduled day after a short month", () => {
    const scheduledDay = 30;
    expect(
      getNextRecurrenceDate(date("2026-01-30"), "MONTHLY", scheduledDay),
    ).toEqual(date("2026-02-28"));
    expect(
      getNextRecurrenceDate(date("2026-02-28"), "MONTHLY", scheduledDay),
    ).toEqual(date("2026-03-30"));
  });
});
