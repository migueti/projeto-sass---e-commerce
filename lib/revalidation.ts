import { revalidatePath } from "next/cache";

export function revalidatePaths(...paths: readonly string[]) {
  for (const path of paths) revalidatePath(path);
}

export function revalidateFinancialPaths() {
  revalidatePaths("/", "/lancamentos", "/contas");
}
