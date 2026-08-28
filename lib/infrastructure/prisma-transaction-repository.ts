import type { PrismaClient } from "@prisma/client";

import type { TransactionRepository } from "@/lib/domain/financial/transaction-repository";
import type { Transaction } from "@/lib/domain/financial/transaction";

export function createPrismaTransactionRepository(
  database: Pick<PrismaClient, "transaction">,
): TransactionRepository {
  return {
    async save(transaction: Transaction) {
      await database.transaction.create({
        data: {
          userId: transaction.props.userId,
          accountId: transaction.props.accountId,
          categoryId: transaction.props.categoryId,
          description: transaction.props.description,
          type: transaction.props.type,
          cents: transaction.cents,
          occurredAt: transaction.props.occurredAt,
          notes: transaction.props.notes,
        },
      });
    },
  };
}