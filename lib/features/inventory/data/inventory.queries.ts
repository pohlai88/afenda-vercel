import "server-only"

import type { InventoryOverviewItem } from "#features/inventory/types"

/**
 * Placeholder query for incremental ERP rollout.
 * Replace with tenant-scoped DB query once inventory tables are introduced.
 */
export async function listInventoryOverview(): Promise<InventoryOverviewItem[]> {
  return []
}
