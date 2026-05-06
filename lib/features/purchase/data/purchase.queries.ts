import "server-only"

import type { PurchaseOverviewItem } from "#features/purchase/types"

/**
 * Placeholder query for incremental ERP rollout.
 * Replace with tenant-scoped DB query once purchase tables are introduced.
 */
export async function listPurchaseOverview(): Promise<PurchaseOverviewItem[]> {
  return []
}
