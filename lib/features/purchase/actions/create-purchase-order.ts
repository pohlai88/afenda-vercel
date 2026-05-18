"use server"

import { revalidatePath } from "next/cache"

import { ORG_APPS_PURCHASE } from "#lib/org-apps-module-paths"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"
import { purchaseFilterSchema } from "../schemas/purchase-filter.schema"
import type { PurchaseActionState } from "../types"

/**
 * Tenant-guarded action stub for incremental rollout.
 * Replace with DB write when purchase tables are ready.
 */
export async function createPurchaseOrder(
  _prevState: PurchaseActionState,
  formData: FormData
): Promise<PurchaseActionState> {
  await requireOrgSession()

  const parsed = purchaseFilterSchema.safeParse({
    query: formData.get("query") ?? "",
    status: formData.get("status") ?? "all",
  })

  if (!parsed.success) {
    return { ok: false, errors: { form: "Invalid purchase payload." } }
  }

  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_PURCHASE),
    "page"
  )
  return { ok: true }
}
