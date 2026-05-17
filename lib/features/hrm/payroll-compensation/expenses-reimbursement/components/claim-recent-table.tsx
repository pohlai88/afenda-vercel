import { getTranslations } from "next-intl/server"

import { ListSurfaceRenderer } from "#components2/metadata/renderers/list-surface.renderer"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import type { ClaimSurfaceAccess } from "../data/claim-access.server"
import { buildClaimRecentListSurfaceConfiguration } from "../data/claim-recent-list-surface.server"
import {
  type ClaimRow,
  listClaimsForCurrentEmployee,
  listClaimsForOrgPage,
} from "../data/claim.queries.server"

type ClaimRecentTableProps = {
  orgSlug: string
  access: ClaimSurfaceAccess
}

export async function ClaimRecentTable({
  orgSlug,
  access,
}: ClaimRecentTableProps) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.claims")

  let rows: ReadonlyArray<ClaimRow>
  try {
    rows = access.canReadOrgClaims
      ? await listClaimsForOrgPage(orgSession.organizationId, { limit: 50 })
      : await listClaimsForCurrentEmployee(
          orgSession.organizationId,
          orgSession.userId,
          { limit: 50 }
        )
  } catch (err) {
    logUnexpectedServerError("claim-recent-table: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("recentLoadFailed")}
      </p>
    )
  }

  const stateLabels = {
    draft: t("state.draft"),
    submitted: t("state.submitted"),
    under_review: t("state.under_review"),
    returned: t("state.returned"),
    approved: t("state.approved"),
    rejected: t("state.rejected"),
    cancelled: t("state.cancelled"),
    paid: t("state.paid"),
  } as const

  const listConfiguration = buildClaimRecentListSurfaceConfiguration(
    rows,
    orgSlug,
    {
      pageTitle: t("recentTitle"),
      pageDescription: t("recentDescription"),
      empty: t("recentEmpty"),
      colEmployee: t("colEmployee"),
      colClaimType: t("colClaimType"),
      colClaimDate: t("colClaimDate"),
      colAmount: t("colAmount"),
      colState: t("colState"),
      colSubmitted: t("colSubmitted"),
      stateLabels,
    }
  )

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("recentEmpty")}</p>
  }

  return (
    <ListSurfaceRenderer
      configuration={listConfiguration}
      variant="table-only"
    />
  )
}
