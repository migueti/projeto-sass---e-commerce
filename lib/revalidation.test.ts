import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

import { revalidatePaths } from "@/lib/revalidation";

describe("revalidatePaths", () => {
  it("forwards paths in the received order", () => {
    revalidatePaths("/", "/contas", "/lancamentos");

    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/"],
      ["/contas"],
      ["/lancamentos"],
    ]);
  });

  it("does nothing for an empty list", () => {
    mocks.revalidatePath.mockClear();

    revalidatePaths();

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});