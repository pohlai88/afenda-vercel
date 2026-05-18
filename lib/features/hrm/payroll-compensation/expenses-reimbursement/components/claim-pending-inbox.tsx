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

export async function ClaimPendingInbox({
  orgSlug,
  canManage,
}: ClaimPendingInboxProps) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.claims")

  let rows: ReadonlyArray<ClaimRow>
  try {
    rows = canManage
      ? await listPendingClaimApprovalsForOrg(orgSession.organizationId)
      : await listPendingClaimApprovalsForActor(
          orgSession.organizationId,
          orgSession.userId
        )
  } catch (err) {
    logUnexpectedServerError("claim-pending-inbox: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: "hrm-claims-pending" },
            columnsId: "hrm-claims-pending",
            rowKey: "id",
            empty: { variant: "muted", title: t("inboxEmpty") },
          },
          columns: [{ id: "employee", header: t("colEmployee") }],
          rows: [],
        }}
        surfaceKey="hrm:claims:pending:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("inboxLoadFailed"),
        }}
      />
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

  const listConfiguration = buildClaimPendingListSurfaceConfiguration(
    rows,
    orgSlug,
    {
      columnsId: "hrm-claims-pending",
      empty: t("inboxEmpty"),
      colEmployee: t("colEmployee"),
      colClaimType: t("colClaimType"),
      colClaimDate: t("colClaimDate"),
      colAmount: t("colAmount"),
      colEvidence: t("colEvidence"),
      colSubmitted: t("colSubmitted"),
      evidenceCountLabel: (count) => t("evidenceCount", { count }),
      stateLabels,
    }
  )

  const showActions = canManage || rows.length > 0
  const claimById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:claims:pending-inbox"
      resolveConfiguredPermission={false}
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
