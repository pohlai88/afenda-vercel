// Phase 3: Replace with real inventory surface (moves, balances, reservations).

import { ErpSurfaceComingSoon } from "#components2/erp-surface-coming-soon"

export async function InventoryPage({ orgSlug }: { orgSlug: string }) {
  return <ErpSurfaceComingSoon orgSlug={orgSlug} surface="inventory" />
}
