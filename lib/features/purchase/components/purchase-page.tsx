// Phase 3: Replace with real purchase surface (requisitions, approvals, vendors).

import { ErpSurfaceComingSoon } from "#components/erp-surface-coming-soon"

export async function PurchasePage({ orgSlug }: { orgSlug: string }) {
  return <ErpSurfaceComingSoon orgSlug={orgSlug} surface="purchase" />
}
