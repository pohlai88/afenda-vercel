import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import { buildClaimPendingListSurfaceConfiguration } from "../data/claim-pending-list-surface.server"
import {
  type ClaimRow,
  listPendingClaimApprovalsForActor,
  listPendingClaimApprovalsForOrg,
} from "../data/claim.queries.server"

import { ClaimDecisionForms } from "./claim-decision-form"

type ClaimPendingInboxProps = {
  orgSlug: string
  canManage: boolean
}

function claimPendingStateLabels(
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

export async function ClaimPendingInbox({
  orgSlug,
  canManage,
}: ClaimPendingInboxProps) {
  const orgSession = await requireOrgSession()

  const [t, rowsResult] = await Promise.all([
    getTranslations("Dashboard.Hrm.claims"),
    (async (): Promise<
      | { ok: true; rows: ReadonlyArray<ClaimRow> }
      | { ok: false; error: unknown }
    > => {
      try {
        const rows = canManage
          ? await listPendingClaimApprovalsForOrg(orgSession.organizationId)
          : await listPendingClaimApprovalsForActor(
              orgSession.organizationId,
              orgSession.userId
            )
        return { ok: true, rows }
      } catch (error) {
        return { ok: false, error }
      }
    })(),
  ])

  const copy = {
    columnsId: "hrm-claims-pending",
    empty: t("inboxEmpty"),
    colEmployee: t("colEmployee"),
    colClaimType: t("colClaimType"),
    colClaimDate: t("colClaimDate"),
    colAmount: t("colAmount"),
    colEvidence: t("colEvidence"),
    colSubmitted: t("colSubmitted"),
    evidenceCountLabel: (count: number) => t("evidenceCount", { count }),
    stateLabels: claimPendingStateLabels(t),
  }

  let listConfiguration = buildClaimPendingListSurfaceConfiguration(
    [],
    orgSlug,
    copy
  )
  let surfaceKey = "hrm:claims:pending-inbox"
  let loadError: { variant: "error"; title: string } | undefined

  if (!rowsResult.ok) {
    logUnexpectedServerError(
      "claim-pending-inbox: query failed",
      rowsResult.error,
      {
        organizationId: orgSession.organizationId,
      }
    )
    surfaceKey = "hrm:claims:pending:error"
    loadError = {
      variant: "error",
      title: t("inboxLoadFailed"),
    }
  } else {
    listConfiguration = buildClaimPendingListSurfaceConfiguration(
      rowsResult.rows,
      orgSlug,
      copy
    )
  }

  const rows = rowsResult.ok ? rowsResult.rows : []
  const showActions = canManage || rows.length > 0
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
        title: t("inboxLoadFailed"),
      }}
      trailingColumn={
        showActions
          ? {
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
            }
          : undefined
      }
    />
  )
}
