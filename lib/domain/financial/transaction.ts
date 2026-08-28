import { Money } from "@/lib/domain/financial/money";

export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionProps = {
  id?: string;
  userId: string;
  accountId: string;
  categoryId?: string | null;
  type: TransactionType;
  description: string;
  amount: Money;
  occurredAt: Date;
  notes?: string | null;
};

export class Transaction {
  private constructor(readonly props: Required<TransactionProps>) {}

  static create(props: TransactionProps) {
    const description = props.description.trim();
    if (!description) throw new Error("TRANSACTION_DESCRIPTION_REQUIRED");
    if (!props.userId || !props.accountId) throw new Error("TRANSACTION_OWNER_REQUIRED");
    if (!(props.occurredAt instanceof Date) || Number.isNaN(props.occurredAt.getTime()))
      throw new Error("TRANSACTION_DATE_INVALID");

    return new Transaction({
      ...props,
      id: props.id ?? "",
      description,
      categoryId: props.categoryId ?? null,
      notes: props.notes ?? null,
    });
  }

  get cents() {
    return this.props.amount.cents;
  }
}