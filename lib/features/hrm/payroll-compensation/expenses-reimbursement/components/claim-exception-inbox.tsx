import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import { buildClaimExceptionListSurfaceConfiguration } from "../data/claim-exception-list-surface.server"
import {
  type ClaimRow,
  listExceptionPendingClaimsForOrg,
} from "../data/claim.queries.server"

import { ClaimDecisionForms } from "./claim-decision-form"

type ClaimExceptionInboxProps = {
  orgSlug: string
}

function claimExceptionStateLabels(
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

export async function ClaimExceptionInbox({
  orgSlug,
}: ClaimExceptionInboxProps) {
  const orgSession = await requireOrgSession()

  const [t, rowsResult] = await Promise.all([
    getTranslations("Dashboard.Hrm.claims"),
    (async (): Promise<
      | { ok: true; rows: ReadonlyArray<ClaimRow> }
      | { ok: false; error: unknown }
    > => {
      try {
        const rows = await listExceptionPendingClaimsForOrg(
          orgSession.organizationId
        )
        return { ok: true, rows }
      } catch (error) {
        return { ok: false, error }
      }
    })(),
  ])

  const copy = {
    columnsId: "hrm-claims-exception",
    empty: t("exceptionQueueEmpty"),
    colEmployee: t("colEmployee"),
    colClaimType: t("colClaimType"),
    colClaimDate: t("colClaimDate"),
    colAmount: t("colAmount"),
    colEvidence: t("colEvidence"),
    colSubmitted: t("colSubmitted"),
    evidenceCountLabel: (count: number) => t("evidenceCount", { count }),
    stateLabels: claimExceptionStateLabels(t),
  }

  let listConfiguration = buildClaimExceptionListSurfaceConfiguration(
    [],
    orgSlug,
    copy
  )
  let surfaceKey = "hrm:claims:exception-inbox"
  let loadError:
    | { variant: "error"; title: string }
    | undefined

  if (!rowsResult.ok) {
    logUnexpectedServerError(
      "claim-exception-inbox: query failed",
      rowsResult.error,
      { organizationId: orgSession.organizationId }
    )
    surfaceKey = "hrm:claims:exception:error"
    loadError = {
      variant: "error",
      title: t("exceptionQueueLoadFailed"),
    }
  } else {
    listConfiguration = buildClaimExceptionListSurfaceConfiguration(
      rowsResult.rows,
      orgSlug,
      copy
    )
  }

  const rows = rowsResult.ok ? rowsResult.rows : []
  const claimById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey={surfaceKey}
      resolveConfiguredPermission={false}
      loadError={loadError}
      invalid={{
        variant: "error",
        title: t("exceptionQueueLoadFailed"),
      }}
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = claimById.get(surfaceRow.id)
          if (!row) return null
          const label = `${row.employeeFullName ?? row.employeeId} · ${row.claimTypeCode} · ${row.amount} ${row.currency}`
          return (
            <ClaimDecisionForms
              claimId={row.id}
              label={label}
              requestedAmount={row.amount}
              currency={row.currency}
            />
          )
        },
      }}
    />
  )
}
