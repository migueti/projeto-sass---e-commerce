import { describe, expect, it } from "vitest";

import { FinancialGoal } from "@/lib/domain/financial/financial-goal";
import { Money } from "@/lib/domain/financial/money";

describe("Financial goal domain", () => {
  const baseGoal = {
    userId: "user-1",
    name: "Reserva de emergência",
    target: Money.fromCents(10_000),
    saved: Money.fromCents(2_000),
  };

  it("completes a goal when the contribution reaches its target", () => {
    const goal = FinancialGoal.create(baseGoal);
    const completed = goal.addContribution(Money.fromCents(8_000));

    expect(completed.props.saved.cents).toBe(10_000);
    expect(completed.props.status).toBe("COMPLETED");
  });

  it("rejects a contribution above the remaining target", () => {
    const goal = FinancialGoal.create(baseGoal);

    expect(() => goal.addContribution(Money.fromCents(8_001))).toThrow(
      "GOAL_CONTRIBUTION_EXCEEDS_TARGET",
    );
  });

  it("rejects a goal whose saved amount exceeds its target", () => {
    expect(() =>
      FinancialGoal.create({
        ...baseGoal,
        saved: Money.fromCents(10_001),
      }),
    ).toThrow("GOAL_SAVED_EXCEEDS_TARGET");
  });
});