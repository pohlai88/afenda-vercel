import "server-only"

import type { AccountingOverviewItem } from "#features/accounting/types"

import { listAccountingJournalBatchesForOrg } from "./accounting-journal.server"

/**
 * Narrow accounting overview for the current foundation slice.
 * Surfaces only persisted payroll-originated journal batches.
 */
export async function listAccountingOverview(
  organizationId: string
): Promise<
  AccountingOverviewItem[]
> {
  const rows = await listAccountingJournalBatchesForOrg(organizationId)
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    status: "posted",
  }))
}
