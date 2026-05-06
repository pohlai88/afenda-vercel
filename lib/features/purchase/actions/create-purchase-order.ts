"use server"

import { revalidatePath } from "next/cache"

import { requireOrgSession } from "#lib/tenant"

import { PURCHASE_ROUTE } from "../constants"
import { purchaseFilterSchema } from "../schemas/purchase-filter.schema"
import type { PurchaseActionState } from "../types"

/**
 * Tenant-guarded action stub for incremental rollout.
 * Replace with DB write when purchase tables are ready.
 */
export async function createPurchaseOrder(
  _prevState: PurchaseActionState,
  formData: FormData,
): Promise<PurchaseActionState> {
  await requireOrgSession()

  const parsed = purchaseFilterSchema.safeParse({
    query: formData.get("query") ?? "",
    status: formData.get("status") ?? "all",
  })

  if (!parsed.success) {
    return { ok: false, errors: { form: "Invalid purchase payload." } }
  }

  revalidatePath(PURCHASE_ROUTE)
  return { ok: true }
}
