export type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

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
