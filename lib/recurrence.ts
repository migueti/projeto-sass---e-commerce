export type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

const MAX_TRANSACTION_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 25;

export type TransactionRetryOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
};

export function isRetryableTransactionConflict(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "P2034";
}

export async function withTransactionRetry<T>(
  operation: () => Promise<T>,
  sleep: (milliseconds: number) => Promise<void> = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  options: TransactionRetryOptions = {},
) {
  const maxAttempts = options.maxAttempts ?? MAX_TRANSACTION_RETRIES;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1)
    throw new Error("maxAttempts deve ser um inteiro positivo.");
  if (!Number.isFinite(initialDelayMs) || initialDelayMs < 0)
    throw new Error("initialDelayMs deve ser um número não negativo.");

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableTransactionConflict(error) || attempt >= maxAttempts - 1)
        throw error;
      await sleep(2 ** attempt * initialDelayMs);
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
