export type PixStatus = "pending" | "approved" | "rejected";

export function paymentStatus(order: Record<string, any>): PixStatus {
  const payment = order.transactions?.payments?.[0];
  const status = payment?.status ?? order.status;
  const statusDetail = payment?.status_detail ?? order.status_detail;
  if (status === "approved" || (status === "processed" && statusDetail === "accredited")) return "approved";
  if (["rejected", "cancelled", "refunded", "charged_back"].includes(status)) return "rejected";
  return "pending";
}

export function publicPaymentStatus(status: PixStatus): { status: PixStatus; message: string } {
  const messages = { pending: "Aguardando pagamento", approved: "Pagamento recebido e aprovado", rejected: "Pagamento recusado ou cancelado" };
  return { status, message: messages[status] };
}
