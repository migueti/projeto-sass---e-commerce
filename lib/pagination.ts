export const MAX_TRANSACTION_PAGE = 1_000;

export function parsePage(value: string | undefined) {
  if (typeof value !== "string") return 1;

  const page = Number(value);
  if (!/^[0-9]+$/.test(value.trim()) || !Number.isSafeInteger(page) || page < 1) {
    return 1;
  }

  return Math.min(page, MAX_TRANSACTION_PAGE);
}