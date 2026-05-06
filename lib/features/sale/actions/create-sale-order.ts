"use server"

import { revalidatePath } from "next/cache"

import { requireOrgSession } from "#lib/tenant"

import { SALE_ROUTE } from "../constants"
import { saleFilterSchema } from "../schemas/sale-filter.schema"
import type { SaleActionState } from "../types"

/**
 * Tenant-guarded action stub for incremental rollout.
 * Replace with DB write when sale tables are ready.
 */
export async function createSaleOrder(
  _prevState: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  await requireOrgSession()

  const parsed = saleFilterSchema.safeParse({
    query: formData.get("query") ?? "",
    status: formData.get("status") ?? "all",
  })

  if (!parsed.success) {
    return { ok: false, errors: { form: "Invalid sale payload." } }
  }

  revalidatePath(SALE_ROUTE)
  return { ok: true }
}
