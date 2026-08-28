import { describe, expect, it, vi } from "vitest";

import {
  getNextRecurrenceDate,
  isRetryableTransactionConflict,
  withTransactionRetry,
} from "@/lib/recurrence";

const date = (value: string) => new Date(`${value}T12:00:00.000Z`);

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

  it("keeps explicit leap-day schedules at month end", () => {
    expect(
      getNextRecurrenceDate(date("2028-02-29"), "YEARLY", 29),
    ).toEqual(date("2029-02-28"));
    expect(
      getNextRecurrenceDate(date("2029-02-28"), "YEARLY", 29),
    ).toEqual(date("2030-02-28"));
  });
});

describe("withTransactionRetry", () => {
  it("retries transaction conflicts and stops after success", async () => {
    const conflict = Object.assign(new Error("write conflict"), { code: "P2034" });
    const operation = vi.fn()
      .mockRejectedValueOnce(conflict)
      .mockResolvedValue("ok");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withTransactionRetry(operation, sleep)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(25);
  });

  it("does not retry unrelated errors or exceed the retry limit", async () => {
    const error = new Error("unexpected");
    const conflict = Object.assign(new Error("write conflict"), { code: "P2034" });
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withTransactionRetry(() => Promise.reject(error), sleep)).rejects.toBe(error);
    await expect(withTransactionRetry(() => Promise.reject(conflict), sleep)).rejects.toBe(conflict);
    expect(isRetryableTransactionConflict(error)).toBe(false);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
