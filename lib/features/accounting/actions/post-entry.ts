"use server"

import { requireOrgSession } from "#lib/tenant"

import { accountingFilterSchema } from "../schemas/accounting-filter.schema"
import type { AccountingActionState } from "../types"

/**
 * Tenant-guarded placeholder action. It validates the submitted shape and then
 * returns an expected failure until accounting foundation tables are introduced.
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
      "Accounting posting is not available until the foundation tables ship.",
    code: "accounting_foundation_only",
  }
}
