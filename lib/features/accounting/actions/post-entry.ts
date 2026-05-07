"use server"

import { revalidatePath } from "next/cache"

import { ORG_DASHBOARD_ACCOUNTING } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"
import { accountingFilterSchema } from "../schemas/accounting-filter.schema"
import type { AccountingActionState } from "../types"

/**
 * Tenant-guarded action stub for incremental rollout.
 * Replace with DB write when accounting tables are ready.
 */
export async function postEntry(
  _prevState: AccountingActionState,
  formData: FormData
): Promise<AccountingActionState> {
  await requireOrgSession()

  const parsed = accountingFilterSchema.safeParse({
    query: formData.get("query") ?? "",
    status: formData.get("status") ?? "all",
  })

  if (!parsed.success) {
    return { ok: false, errors: { form: "Invalid accounting payload." } }
  }

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_ACCOUNTING),
    "page"
  )
  return { ok: true }
}
