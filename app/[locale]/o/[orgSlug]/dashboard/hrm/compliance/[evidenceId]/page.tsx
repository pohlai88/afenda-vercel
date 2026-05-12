import { ComplianceEvidenceDetailPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type OrgDashboardHrmComplianceEvidenceDetailPageProps = {
  params: Promise<{
    locale: string
    orgSlug: string
    evidenceId: string
  }>
}

/**
 * Phase 3K — Per-evidence compliance lifecycle drill-down.
 *
 * Surface for HR / regulator inspection. The route file stays thin (URL
 * params + composition only); the entire surface — Tier A session guard,
 * timeline composition, not-found branching, and rendering — lives inside
 * `ComplianceEvidenceDetailPage` per the AGENTS.md "page = composition,
 * features = work" rule.
 */
export default async function OrgDashboardHrmComplianceEvidenceDetailPage({
  params,
}: OrgDashboardHrmComplianceEvidenceDetailPageProps) {
  const { orgSlug, evidenceId } = await params
  return (
    <ComplianceEvidenceDetailPage orgSlug={orgSlug} evidenceId={evidenceId} />
  )
}
