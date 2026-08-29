const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map<string, { count: number; resetAt: number }>();

function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

function removeExpiredAttempts(now: number) {
  for (const [key, entry] of attempts) {
    if (entry.resetAt <= now) attempts.delete(key);
  }
}

export function consumeLoginAttempt(identifier: string, now = Date.now()) {
  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) return false;

  removeExpiredAttempts(now);
  const current = attempts.get(normalizedIdentifier);
  if (!current || current.resetAt <= now) {
    attempts.set(normalizedIdentifier, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_ATTEMPTS) return false;
  current.count += 1;
  return true;
}

export function resetLoginAttempts(identifier: string) {
  attempts.delete(normalizeIdentifier(identifier));
}

export const consumeRegistrationAttempt = (email: string, now = Date.now()) =>
  consumeLoginAttempt(`registration:${normalizeIdentifier(email)}`, now);

export const loginRateLimit = {
  maxAttempts: MAX_ATTEMPTS,
  windowMs: WINDOW_MS,
};