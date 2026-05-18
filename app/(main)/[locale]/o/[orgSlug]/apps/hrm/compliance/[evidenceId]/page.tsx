import { ComplianceEvidenceDetailPage } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"


type OrgAppsHrmComplianceEvidenceDetailPageProps = {
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
export default async function OrgAppsHrmComplianceEvidenceDetailPage({
  params,
}: OrgAppsHrmComplianceEvidenceDetailPageProps) {
  const { orgSlug, evidenceId } = await params
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "compliance",
    function: "read",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Compliance evidence"
        description="This HRM surface requires Compliance read access."
      />
    )
  }
  return (
    <ComplianceEvidenceDetailPage orgSlug={orgSlug} evidenceId={evidenceId} />
  )
}
