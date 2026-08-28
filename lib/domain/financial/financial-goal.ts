import { Money } from "@/lib/domain/financial/money";

export type FinancialGoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type FinancialGoalProps = {
  id?: string;
  userId: string;
  name: string;
  target: Money;
  saved: Money;
  status?: FinancialGoalStatus;
};

export class FinancialGoal {
  private constructor(readonly props: Required<FinancialGoalProps>) {}

  static create(props: FinancialGoalProps) {
    const name = props.name.trim();
    if (!name) throw new Error("GOAL_NAME_REQUIRED");
    if (!props.userId) throw new Error("GOAL_OWNER_REQUIRED");
    if (props.saved.cents > props.target.cents)
      throw new Error("GOAL_SAVED_EXCEEDS_TARGET");

    return new FinancialGoal({
      ...props,
      id: props.id ?? "",
      name,
      status: props.saved.cents === props.target.cents ? "COMPLETED" : props.status ?? "ACTIVE",
    });
  }

  addContribution(amount: Money) {
    if (this.props.status !== "ACTIVE") throw new Error("GOAL_NOT_ACTIVE");
    const saved = this.props.saved.cents + amount.cents;
    if (saved > this.props.target.cents)
      throw new Error("GOAL_CONTRIBUTION_EXCEEDS_TARGET");
    return FinancialGoal.create({
      ...this.props,
      saved: Money.fromCents(saved),
      status: saved === this.props.target.cents ? "COMPLETED" : "ACTIVE",
    });
  }
}