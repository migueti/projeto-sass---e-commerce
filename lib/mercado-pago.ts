import { randomUUID } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const PLAN_PRICE_CENTS = 2990;

function client() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_NOT_CONFIGURED");
  return new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
}

export function planPriceCents() {
  const configured = Number(process.env.NUVEM_PLAN_PRICE ?? "29.90");
  return Number.isFinite(configured) && configured > 0
    ? Math.round(configured * 100)
    : PLAN_PRICE_CENTS;
}

export function buildCheckoutPreferenceBody(
  email: string,
  baseUrl: string,
  externalReference: string,
) {
  return {
    items: [{
      id: "nuvem-access",
      title: "Acesso ao nuvem.",
      description: "Acesso digital ao sistema de controle financeiro pessoal nuvem.",
      quantity: 1,
      currency_id: "BRL",
      unit_price: planPriceCents() / 100,
    }],
    payer: { email },
    external_reference: externalReference,
    notification_url: `${baseUrl}/api/payments/webhook`,
    back_urls: {
      success: `${baseUrl}/assinar?status=success`,
      failure: `${baseUrl}/assinar?status=failure`,
      pending: `${baseUrl}/assinar?status=pending`,
    },
    auto_return: "approved" as const,
  };
}

export async function createCheckoutPreference(userId: string, email: string) {
  const baseUrl = process.env.NEXTAUTH_URL;
  if (!baseUrl) throw new Error("MERCADOPAGO_NOT_CONFIGURED");
  const externalReference = `nuvem:user:${userId}:${randomUUID()}`;
  const response = await new Preference(client()).create({
    body: buildCheckoutPreferenceBody(email, baseUrl, externalReference),
  });

  const checkoutUrl = process.env.MERCADOPAGO_USE_SANDBOX === "true"
    ? response.sandbox_init_point
    : response.init_point;
  if (!checkoutUrl) throw new Error("MERCADOPAGO_INVALID_RESPONSE");
  return { checkoutUrl, externalReference };
}

export async function getMercadoPagoPayment(paymentId: string) {
  return new Payment(client()).get({ id: paymentId });
}
