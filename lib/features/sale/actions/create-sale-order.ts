"use server"

import { revalidatePath } from "next/cache"

import { ORG_APPS_SALE } from "#lib/org-apps-module-paths"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/auth"
import { saleFilterSchema } from "../schemas/sale-filter.schema"
import type { SaleActionState } from "../types"

/**
 * Tenant-guarded action stub for incremental rollout.
 * Replace with DB write when sale tables are ready.
 */
export async function createSaleOrder(
  _prevState: SaleActionState,
  formData: FormData
): Promise<SaleActionState> {
  await requireOrgSession()

  const parsed = saleFilterSchema.safeParse({
    query: formData.get("query") ?? "",
    status: formData.get("status") ?? "all",
  })

  if (!parsed.success) {
    return { ok: false, errors: { form: "Invalid sale payload." } }
  }

  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_SALE),
    "page"
  )
  return { ok: true }
}
