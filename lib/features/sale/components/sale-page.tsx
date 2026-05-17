// Phase 3: Replace with real sale surface (orders, quotations, billing).

import { ErpSurfaceComingSoon } from "#components2/erp-surface-coming-soon"

export async function SalePage({ orgSlug }: { orgSlug: string }) {
  return <ErpSurfaceComingSoon orgSlug={orgSlug} surface="sale" />
}
