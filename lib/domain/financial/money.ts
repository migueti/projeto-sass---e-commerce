export class Money {
  private constructor(readonly cents: number) {}

  static fromCents(cents: number) {
    if (!Number.isSafeInteger(cents) || cents < 0)
      throw new Error("MONEY_INVALID");
    return new Money(cents);
  }
}