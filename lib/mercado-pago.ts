import { randomUUID } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { getPlanPriceCents } from "@/lib/billing";

export function getMercadoPagoBaseUrl() {
  const value = process.env.APP_URL ?? process.env.NEXTAUTH_URL;
  if (!value) throw new Error("MERCADOPAGO_NOT_CONFIGURED");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("MERCADOPAGO_INVALID_BASE_URL");
  }

  if (!url.hostname || !["http:", "https:"].includes(url.protocol))
    throw new Error("MERCADOPAGO_INVALID_BASE_URL");
  if (url.pathname !== "/" || url.search || url.hash)
    throw new Error("MERCADOPAGO_INVALID_BASE_URL");

  return url.origin;
}

function client() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MERCADOPAGO_NOT_CONFIGURED");
  return new MercadoPagoConfig({ accessToken, options: { timeout: 5000 } });
}

export function buildCheckoutPreferenceBody(
  email: string,
  baseUrl: string,
  externalReference: string,
  priceCents: number,
) {
  return {
    items: [{
      id: "nuvem-access",
      title: "Acesso ao nuvem.",
      description: "Acesso digital ao sistema de controle financeiro pessoal nuvem.",
      quantity: 1,
      currency_id: "BRL",
      unit_price: priceCents / 100,
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
  const baseUrl = getMercadoPagoBaseUrl();
  const priceCents = await getPlanPriceCents();
  const externalReference = `nuvem:user:${userId}:price:${priceCents}:${randomUUID()}`;
  const response = await new Preference(client()).create({
    body: buildCheckoutPreferenceBody(email, baseUrl, externalReference, priceCents),
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
