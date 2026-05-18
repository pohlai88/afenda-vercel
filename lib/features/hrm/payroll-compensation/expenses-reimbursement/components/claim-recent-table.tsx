import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  type EmptyState,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

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

function claimRecentStateLabels(
  t: Awaited<ReturnType<typeof getTranslations<"Dashboard.Hrm.claims">>>
) {
  return {
    draft: t("state.draft"),
    submitted: t("state.submitted"),
    under_review: t("state.under_review"),
    returned: t("state.returned"),
    approved: t("state.approved"),
    rejected: t("state.rejected"),
    cancelled: t("state.cancelled"),
    paid: t("state.paid"),
  } as const
}

export async function ClaimRecentTable({
  orgSlug,
  access,
}: ClaimRecentTableProps) {
  const orgSession = await requireOrgSession()

  const [t, rowsResult] = await Promise.all([
    getTranslations("Dashboard.Hrm.claims"),
    (async (): Promise<
      | { ok: true; rows: ReadonlyArray<ClaimRow> }
      | { ok: false; error: unknown }
    > => {
      try {
        const rows = access.canReadOrgClaims
          ? await listClaimsForOrgPage(orgSession.organizationId, {
              limit: 50,
            })
          : await listClaimsForCurrentEmployee(
              orgSession.organizationId,
              orgSession.userId,
              { limit: 50 }
            )
        return { ok: true, rows }
      } catch (error) {
        return { ok: false, error }
      }
    })(),
  ])

  const copy = {
    pageTitle: t("recentTitle"),
    pageDescription: t("recentDescription"),
    empty: t("recentEmpty"),
    colEmployee: t("colEmployee"),
    colClaimType: t("colClaimType"),
    colClaimDate: t("colClaimDate"),
    colAmount: t("colAmount"),
    colState: t("colState"),
    colSubmitted: t("colSubmitted"),
    stateLabels: claimRecentStateLabels(t),
  }

  let listConfiguration: ListSurfaceRendererConfigurationInput
  let surfaceKey = "hrm:claims:recent-activity"
  let loadError: EmptyState | undefined

  if (!rowsResult.ok) {
    logUnexpectedServerError(
      "claim-recent-table: query failed",
      rowsResult.error,
      { organizationId: orgSession.organizationId }
    )
    listConfiguration = buildClaimRecentListSurfaceConfiguration(
      [],
      orgSlug,
      copy
    )
    surfaceKey = "hrm:claims:recent-activity:error"
    loadError = {
      variant: "error",
      title: t("recentLoadFailed"),
    }
  } else {
    listConfiguration = buildClaimRecentListSurfaceConfiguration(
      rowsResult.rows,
      orgSlug,
      copy
    )
  }

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey={surfaceKey}
      resolveConfiguredPermission={false}
      parentAccessAllowed={
        access.canReadOrgClaims || access.hasSelfServiceEmployee
      }
      loadError={loadError}
      invalid={{
        variant: "error",
        title: t("recentLoadFailed"),
      }}
    />
  )
}
