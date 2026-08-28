import type { Transaction } from "@/lib/domain/financial/transaction";

export type TransactionRepository = {
  save(transaction: Transaction): Promise<void>;
};