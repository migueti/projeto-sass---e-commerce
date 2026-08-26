export type RecurrenceFrequency = "WEEKLY" | "MONTHLY" | "YEARLY";

export function getNextRecurrenceDate(
  date: Date,
  frequency: RecurrenceFrequency,
) {
  const next = new Date(date);
  if (frequency === "WEEKLY") {
    next.setDate(next.getDate() + 7);
    return next;
  }

  const day = next.getDate();
  const sourceLastDay = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  const staysAtMonthEnd = day === sourceLastDay;

  next.setDate(1);
  if (frequency === "MONTHLY") next.setMonth(next.getMonth() + 1);
  else next.setFullYear(next.getFullYear() + 1);

  const targetLastDay = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(staysAtMonthEnd ? targetLastDay : Math.min(day, targetLastDay));
  return next;
}
