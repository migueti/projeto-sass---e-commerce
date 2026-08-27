export const MAX_TRANSACTION_PAGE = 1_000;

export function parsePage(value: string | undefined) {
  const page = Number(value);
  if (!Number.isSafeInteger(page) || page < 1) return 1;
  return Math.min(page, MAX_TRANSACTION_PAGE);
}