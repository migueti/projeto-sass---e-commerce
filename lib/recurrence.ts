export type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

const MAX_TRANSACTION_RETRIES = 3;

export function isRetryableTransactionConflict(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "P2034";
}

export async function withTransactionRetry<T>(
  operation: () => Promise<T>,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableTransactionConflict(error) || attempt >= MAX_TRANSACTION_RETRIES - 1)
        throw error;
      await sleep(2 ** attempt * 25);
    }
  }
}

export function getNextRecurrenceDate(
  date: Date,
  frequency: RecurrenceFrequency,
  scheduledDay?: number,
) {
  const next = new Date(date);
  if (frequency === "WEEKLY") {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  const day = scheduledDay ?? next.getUTCDate();
  const sourceLastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const staysAtMonthEnd =
    scheduledDay === undefined && day === sourceLastDay;

  next.setUTCDate(1);
  if (frequency === "MONTHLY") next.setUTCMonth(next.getUTCMonth() + 1);
  else next.setUTCFullYear(next.getUTCFullYear() + 1);

  const targetLastDay = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0),
  ).getUTCDate();
  next.setUTCDate(staysAtMonthEnd ? targetLastDay : Math.min(day, targetLastDay));
  return next;
}
