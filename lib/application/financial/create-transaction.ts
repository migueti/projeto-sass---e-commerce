import { Money } from "@/lib/domain/financial/money";
import { Transaction, type TransactionType } from "@/lib/domain/financial/transaction";
import type { TransactionRepository } from "@/lib/domain/financial/transaction-repository";

export type CreateTransactionCommand = {
  userId: string;
  accountId: string;
  categoryId?: string | null;
  type: TransactionType;
  description: string;
  cents: number;
  occurredAt: Date;
  notes?: string | null;
};

export async function createTransaction(
  command: CreateTransactionCommand,
  repository: TransactionRepository,
) {
  const transaction = Transaction.create({
    ...command,
    amount: Money.fromCents(command.cents),
  });
  await repository.save(transaction);
  return transaction;
}