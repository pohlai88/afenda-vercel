// Phase 3: Replace with real accounting surface (ledger, posting, reconciliation).

import { ErpSurfaceComingSoon } from "#components/erp-surface-coming-soon"

export async function AccountingPage({ orgSlug }: { orgSlug: string }) {
  return <ErpSurfaceComingSoon orgSlug={orgSlug} surface="accounting" />
}
