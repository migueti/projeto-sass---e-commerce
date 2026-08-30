/**
 * Ownership Validation Helpers
 *
 * Centralized helpers to validate that records belong to the authenticated user.
 * These ensure consistent ownership checks across all Server Actions and API routes.
 *
 * Usage:
 *   const account = await requireOwnedAccount(accountId, user.id);
 *   const category = await requireOwnedCategory(categoryId, user.id);
 *
 * All functions throw UnauthorizedError if record not found or doesn't belong to user.
 */

import { prisma } from "./prisma";
import { UnauthorizedError } from "./errors";

/**
 * Validates that a financial account belongs to the user.
 * @throws UnauthorizedError if account not found or doesn't belong to user.
 */
export async function requireOwnedAccount(accountId: string, userId: string) {
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId },
  });
  if (!account) throw new UnauthorizedError("Conta não encontrada.");
  return account;
}

/**
 * Validates that a category belongs to the user.
 * @throws UnauthorizedError if category not found or doesn't belong to user.
 */
export async function requireOwnedCategory(
  categoryId: string,
  userId: string
) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, userId },
  });
  if (!category) throw new UnauthorizedError("Categoria não encontrada.");
  return category;
}

/**
 * Validates that a transaction belongs to the user.
 * @throws UnauthorizedError if transaction not found or doesn't belong to user.
 */
export async function requireOwnedTransaction(
  transactionId: string,
  userId: string
) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!transaction) throw new UnauthorizedError("Lançamento não encontrado.");
  return transaction;
}

/**
 * Validates that a financial goal belongs to the user.
 * @throws UnauthorizedError if goal not found or doesn't belong to user.
 */
export async function requireOwnedGoal(goalId: string, userId: string) {
  const goal = await prisma.financialGoal.findFirst({
    where: { id: goalId, userId },
  });
  if (!goal) throw new UnauthorizedError("Meta não encontrada.");
  return goal;
}

/**
 * Validates that a recurring transaction belongs to the user.
 * @throws UnauthorizedError if recurring transaction not found or doesn't belong to user.
 */
export async function requireOwnedRecurrence(
  recurrenceId: string,
  userId: string
) {
  const recurrence = await prisma.recurringTransaction.findFirst({
    where: { id: recurrenceId, userId },
  });
  if (!recurrence) throw new UnauthorizedError("Recorrência não encontrada.");
  return recurrence;
}
