import { getTranslations } from "next-intl/server"

import { ListSurfaceTable } from "#components2/metadata/renderers/list-surface-table"
import { parseListSurfaceRendererConfiguration } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import { buildClaimExceptionListSurfaceConfiguration } from "../data/claim-exception-list-surface.server"
import {
  type ClaimRow,
  listExceptionPendingClaimsForOrg,
} from "../data/claim.queries.server"

import { ClaimDecisionForms } from "./claim-decision-form"

type ClaimExceptionInboxProps = {
  orgSlug: string
}

export async function ClaimExceptionInbox({ orgSlug }: ClaimExceptionInboxProps) {
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
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("exceptionQueueLoadFailed")}
      </p>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("exceptionQueueEmpty")}</p>
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

  const parsed = parseListSurfaceRendererConfiguration(listConfiguration)
  if (!parsed.success) {
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("exceptionQueueLoadFailed")}
      </p>
    )
  }

  const claimById = new Map(rows.map((row) => [row.id, row]))

  return (
    <ListSurfaceTable
      columns={parsed.data.columns}
      rows={parsed.data.rows}
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
