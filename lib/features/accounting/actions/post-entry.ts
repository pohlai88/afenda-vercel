"use server"

import { requireOrgSession } from "#lib/tenant"

import { accountingFilterSchema } from "../schemas/accounting-filter.schema"
import type { AccountingActionState } from "../types"

/**
 * Tenant-guarded placeholder action. Manual accounting entry stays out of scope
 * for this slice even though payroll-originated posting is now persisted.
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
    return {
      ok: false,
      error: "Invalid accounting payload.",
      fieldErrors: { form: "Invalid accounting payload." },
    }
  }

  return {
    ok: false,
    error:
      "Manual accounting posting is not available in this slice. Only payroll-originated governed posting is enabled.",
    code: "accounting_foundation_only",
  }
}
