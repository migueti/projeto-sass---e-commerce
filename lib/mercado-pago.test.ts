import { describe, expect, it } from "vitest";

import {
  buildCheckoutPreferenceBody,
  getMercadoPagoBaseUrl,
  validateMercadoPagoEnvironment,
} from "@/lib/mercado-pago";

describe("Mercado Pago checkout preference", () => {
  it("prefers the public app URL and removes a trailing slash", () => {
    process.env.APP_URL = "https://nuvem.example.com/";
    process.env.NEXTAUTH_URL = "http://localhost:3000";

    expect(getMercadoPagoBaseUrl()).toBe("https://nuvem.example.com");
  });

  it("rejects a URL with a path because callbacks must target the app origin", () => {
    process.env.APP_URL = "https://nuvem.example.com/preview";

    expect(() => getMercadoPagoBaseUrl()).toThrow("MERCADOPAGO_INVALID_BASE_URL");
  });

  it("rejects a production token when sandbox mode is enabled", () => {
    expect(() => validateMercadoPagoEnvironment("APP_USR-production", true))
      .toThrow("MERCADOPAGO_ENVIRONMENT_MISMATCH");
  });

  it("rejects a test token when production mode is enabled", () => {
    expect(() => validateMercadoPagoEnvironment("TEST-sandbox", false))
      .toThrow("MERCADOPAGO_ENVIRONMENT_MISMATCH");
  });

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

  it("rejects invalid prices before building the provider payload", () => {
    expect(() => buildCheckoutPreferenceBody("cliente@example.com", "https://nuvem.example.com", "reference", 0))
      .toThrow("MERCADOPAGO_INVALID_PRICE");
    expect(() => buildCheckoutPreferenceBody("cliente@example.com", "https://nuvem.example.com", "reference", 29.9))
      .toThrow("MERCADOPAGO_INVALID_PRICE");
    expect(() => buildCheckoutPreferenceBody("cliente@example.com", "https://nuvem.example.com", "reference", -100))
      .toThrow("MERCADOPAGO_INVALID_PRICE");
    expect(() => buildCheckoutPreferenceBody("cliente@example.com", "https://nuvem.example.com", "reference", 2_147_483_648))
      .toThrow("MERCADOPAGO_INVALID_PRICE");
  });
});
