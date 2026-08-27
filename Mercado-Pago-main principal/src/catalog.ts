export type DocumentationEntry = {
  title: string;
  description: string;
  product: string;
  path: string;
  keywords: string[];
};

export const DOCUMENTATION_BASE = "https://www.mercadopago.com.br/developers/pt/docs";

export const documentationCatalog: DocumentationEntry[] = [
  {
    title: "Mercado Pago MCP Server",
    description: "Conheca o MCP Server do Mercado Pago.",
    product: "MCP Server",
    path: "/mcp-server/overview",
    keywords: ["mcp", "servidor", "ia", "ide"]
  },
  {
    title: "Checkout API via Orders",
    description: "Controle total do Checkout Transparente usando a API de Orders.",
    product: "Checkout API Orders",
    path: "/checkout-api-orders/overview",
    keywords: ["checkout", "transparente", "orders", "pedido"]
  },
  {
    title: "Integrar Pix com Orders",
    description: "Ofereca pagamentos Pix no Checkout Transparente com Orders API.",
    product: "Checkout API Orders",
    path: "/checkout-api-orders/payment-integration/pix",
    keywords: ["pix", "orders", "checkout", "pagamento"]
  },
  {
    title: "Integrar cartoes com Orders",
    description: "Configure pagamentos com cartao usando Orders API.",
    product: "Checkout API Orders",
    path: "/checkout-api-orders/payment-integration/cards",
    keywords: ["cartao", "cartoes", "orders", "checkout"]
  },
  {
    title: "Checkout API via Payments",
    description: "Checkout Transparente usando a Payments API.",
    product: "Checkout API Payments",
    path: "/checkout-api-payments/overview",
    keywords: ["checkout", "payments", "pagamentos", "v1/payments"]
  },
  {
    title: "Checkout Pro",
    description: "Processamento de pagamentos no ambiente do Mercado Pago.",
    product: "Checkout Pro",
    path: "/checkout-pro/overview",
    keywords: ["checkout pro", "preferencia", "redirect", "pagamento"]
  },
  {
    title: "Criar preferencia de pagamento",
    description: "Crie a preferencia que permite cobrar com Checkout Pro.",
    product: "Checkout Pro",
    path: "/checkout-pro/create-payment-preference",
    keywords: ["preferencia", "checkout pro", "preference"]
  },
  {
    title: "Webhooks",
    description: "Configure notificacoes Webhooks para sua aplicacao.",
    product: "Your integrations",
    path: "/your-integrations/notifications/webhooks",
    keywords: ["webhook", "notificacao", "assinatura", "x-signature"]
  },
  {
    title: "Credenciais",
    description: "Saiba como obter e proteger as credenciais da integracao.",
    product: "Your integrations",
    path: "/your-integrations/credentials",
    keywords: ["credencial", "access token", "public key", "token"]
  },
  {
    title: "Seguranca OAuth",
    description: "Protocolo OAuth para acesso limitado a contas Mercado Pago.",
    product: "Security",
    path: "/security/oauth",
    keywords: ["oauth", "access token", "refresh token", "seguranca"]
  }
];
