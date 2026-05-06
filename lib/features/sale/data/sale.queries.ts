import "server-only"

import type { SaleOverviewItem } from "#features/sale/types"

/**
 * Placeholder query for incremental ERP rollout.
 * Replace with tenant-scoped DB query once sale tables are introduced.
 */
export async function listSaleOverview(): Promise<SaleOverviewItem[]> {
  return []
}
