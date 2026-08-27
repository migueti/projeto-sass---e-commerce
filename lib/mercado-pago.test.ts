import { describe, expect, it } from "vitest";

import { buildCheckoutPreferenceBody } from "@/lib/mercado-pago";

describe("Mercado Pago checkout preference", () => {
  it("describes the digital product in the item payload", () => {
    const body = buildCheckoutPreferenceBody(
      "cliente@example.com",
      "https://nuvem.example.com",
      "nuvem:user:user-1:price:2990:checkout-1",
      2990,
    );

    expect(body.items[0]).toMatchObject({
      title: "Acesso ao nuvem.",
      description: "Acesso digital ao sistema de controle financeiro pessoal nuvem.",
      quantity: 1,
    });
  });
});
