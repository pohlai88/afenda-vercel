"use server"

import { revalidatePath } from "next/cache"

import { ORG_DASHBOARD_INVENTORY } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"
import { inventoryFilterSchema } from "../schemas/inventory-filter.schema"
import type { InventoryActionState } from "../types"

/**
 * Tenant-guarded action stub for incremental rollout.
 * Replace with DB write when inventory tables are ready.
 */
export async function reserveStock(
  _prevState: InventoryActionState,
  formData: FormData
): Promise<InventoryActionState> {
  await requireOrgSession()

  const parsed = inventoryFilterSchema.safeParse({
    query: formData.get("query") ?? "",
    status: formData.get("status") ?? "all",
  })

  if (!parsed.success) {
    return { ok: false, errors: { form: "Invalid inventory payload." } }
  }

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_INVENTORY),
    "page"
  )
  return { ok: true }
}
