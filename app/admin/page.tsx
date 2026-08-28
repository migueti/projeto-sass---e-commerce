import { requireAdminUser } from "@/lib/auth";
import { getPlanPriceCents } from "@/lib/billing";
import { PriceForm } from "@/app/admin/price-form";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export default async function AdminPage() {
  try {
    await requireAdminUser();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login?callbackUrl=%2Fadmin");
    }
    if (error instanceof Error && error.message === "FORBIDDEN") notFound();
    throw error;
  }
  const price = await getPlanPriceCents();

  return (
    <main className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ADMINISTRAÇÃO</p>
          <h1>Configurações comerciais</h1>
          <p className="heading-copy">Defina o preço atual do acesso ao nuvem.</p>
        </div>
      </div>
      <section className="panel" style={{ maxWidth: 520 }}>
        <div className="panel-header">
          <div>
            <h3>Plano completo</h3>
            <p>Preço atual: {formatPrice(price)}</p>
          </div>
        </div>
        <PriceForm price={(price / 100).toFixed(2).replace(".", ",")} />
      </section>
    </main>
  );
}
