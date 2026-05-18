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

export async function ClaimExceptionInbox({
  orgSlug,
}: ClaimExceptionInboxProps) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.claims")

  let rows: ReadonlyArray<ClaimRow>
  try {
    rows = await listExceptionPendingClaimsForOrg(orgSession.organizationId)
  } catch (err) {
    logUnexpectedServerError("claim-exception-inbox: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: "hrm-claims-exception" },
            columnsId: "hrm-claims-exception",
            rowKey: "id",
            empty: { variant: "muted", title: t("exceptionQueueEmpty") },
          },
          columns: [{ id: "employee", header: t("colEmployee") }],
          rows: [],
        }}
        surfaceKey="hrm:claims:exception:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("exceptionQueueLoadFailed"),
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

  const listConfiguration = buildClaimExceptionListSurfaceConfiguration(
    rows,
    orgSlug,
    {
      columnsId: "hrm-claims-exception",
      empty: t("exceptionQueueEmpty"),
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

  const claimById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:claims:exception-inbox"
      resolveConfiguredPermission={false}
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
