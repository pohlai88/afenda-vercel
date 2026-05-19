import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { Button } from "#components2/ui/button"

import { archiveComplianceObligationFormAction } from "../actions/compliance-obligation.actions"
import { buildComplianceObligationsListSurfaceConfiguration } from "../data/compliance-list-surface.server"
import type { ComplianceObligationRow } from "../data/compliance-obligation.queries.server"

type ComplianceObligationsListSectionProps = {
  orgSlug: string
  canUpdate: boolean
  rows: readonly ComplianceObligationRow[]
}

function formatObligationScope(row: ComplianceObligationRow): string {
  return [
    row.countryCode ?? "Global",
    row.legalEntityCode ?? null,
    row.workLocationCode ?? null,
    row.employmentType ?? null,
    row.workerCategory ?? null,
  ]
    .filter(Boolean)
    .join(" · ")
}

export async function ComplianceObligationsListSection({
  orgSlug,
  canUpdate,
  rows,
}: ComplianceObligationsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.compliance.obligations")

  const trailingContext = {
    showActionsColumn: canUpdate,
    canUpdate,
  }

  const listConfiguration = buildComplianceObligationsListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colCode: t("colCode"),
      colTitle: t("colTitle"),
      colKind: t("colKind"),
      colArea: t("colArea"),
      colStatus: t("colStatus"),
      colScope: t("colScope"),
      formatScope: formatObligationScope,
    },
    trailingContext
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:compliance:obligations"
      trailingColumn={
        canUpdate
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const row = rowById.get(surfaceRow.id)
                if (
                  !row ||
                  !isListSurfaceTrailingActionRenderable(trailingAction) ||
                  row.status === "archived"
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot trailingAction={trailingAction}>
                    <form action={archiveComplianceObligationFormAction}>
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="obligationId" value={row.id} />
                      <Button type="submit" size="sm" variant="secondary">
                        {t("archiveSubmit")}
                      </Button>
                    </form>
                  </GovernedTrailingActionSlot>
                )
              },
            }
          : undefined
      }
    />
  )
}
