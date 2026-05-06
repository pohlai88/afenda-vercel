import "server-only"

import type { AccountingOverviewItem } from "#features/accounting/types"

/**
 * Placeholder query for incremental ERP rollout.
 * Replace with tenant-scoped DB query once accounting tables are introduced.
 */
export async function listAccountingOverview(): Promise<AccountingOverviewItem[]> {
  return []
}
