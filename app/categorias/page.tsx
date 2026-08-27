import { createCategory, deleteCategory } from "@/app/actions/categories";
import { requirePaidUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CategoriesPage() {
  const user = await requirePaidUser();
  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    include: { _count: { select: { transactions: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <main className="content-wrap">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ORGANIZAÇÃO</p>
          <h1>Categorias</h1>
          <p className="heading-copy">
            Personalize os grupos que dão sentido aos seus lançamentos.
          </p>
        </div>
      </div>
      <div className="crud-grid">
        <section className="panel">
          <h3>Nova categoria</h3>
          <form action={createCategory} className="crud-form">
            <label>
              Nome <small>(obrigatório)</small>
              <input name="name" placeholder="Ex.: Saúde" required aria-required="true" />
            </label>
            <label>
              Cor
              <input name="color" type="color" defaultValue="#5d8e63" aria-label="Escolha uma cor para a categoria" />
            </label>
            <button className="primary-button">Criar categoria</button>
          </form>
        </section>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Suas categorias</h3>
              <p>{categories.length} categoria(s) cadastrada(s)</p>
            </div>
          </div>
          <div className="records">
            {categories.length ? (
              categories.map((category) => (
                <div className="record" key={category.id}>
                  <div className="category-record-name">
                    <i
                      style={{ backgroundColor: category.color ?? "#9da49c" }}
                    />
                    <strong>{category.name}</strong>
                  </div>
                  <small>{category._count.transactions} lançamento(s)</small>
                  <form action={deleteCategory.bind(null, category.id)}>
                    <button className="delete-button" type="submit" aria-label={`Excluir categoria ${category.name}`}>×</button>
                  </form>
                </div>
              ))
            ) : (
              <p className="heading-copy">Nenhuma categoria cadastrada.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
