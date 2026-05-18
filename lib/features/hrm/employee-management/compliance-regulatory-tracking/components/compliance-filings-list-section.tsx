import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Textarea } from "#components2/ui/textarea"

import {
  completeFilingFormAction,
  updateFilingFormAction,
  waiveFilingFormAction,
} from "../actions/compliance-filing.actions"
import { buildComplianceFilingsListSurfaceConfiguration } from "../data/compliance-list-surface.server"
import type { ComplianceFilingListRow } from "../data/compliance-filing.queries.server"

type ComplianceFilingsListSectionProps = {
  orgSlug: string
  canUpdate: boolean
  rows: readonly ComplianceFilingListRow[]
}

export async function ComplianceFilingsListSection({
  orgSlug,
  canUpdate,
  rows,
}: ComplianceFilingsListSectionProps) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.compliance.filings"),
    getFormatter(),
  ])

  const trailingContext = {
    showActionsColumn: canUpdate,
    canUpdate,
  }

  const listConfiguration = buildComplianceFilingsListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colTitle: t("colTitle"),
      colCategory: t("colCategory"),
      colStatus: t("colStatus"),
      colDue: t("colDue"),
      colScope: t("colScope"),
      formatDueDate: (date) => format.dateTime(date, { dateStyle: "medium" }),
    },
    trailingContext
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:compliance:filings"
      trailingColumn={
        canUpdate
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const row = rowById.get(surfaceRow.id)
                if (
                  !row ||
                  !isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return null
                }
                return (
                  <GovernedTrailingActionSlot trailingAction={trailingAction}>
                    <div className="grid min-w-[16rem] gap-2">
                      <form
                        action={updateFilingFormAction}
                        className="flex flex-col gap-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input type="hidden" name="filingId" value={row.id} />
                        <Input
                          name="submittedAt"
                          type="date"
                          required
                          className="text-xs"
                        />
                        <Input
                          name="confirmationReference"
                          placeholder={t("submissionReferencePlaceholder")}
                          className="text-xs"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          className="w-fit"
                        >
                          {t("markSubmitted")}
                        </Button>
                      </form>
                      <form
                        action={completeFilingFormAction}
                        className="flex flex-col gap-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input type="hidden" name="filingId" value={row.id} />
                        <Input
                          name="confirmedAt"
                          type="date"
                          required
                          className="text-xs"
                        />
                        <Input
                          name="confirmationReference"
                          placeholder={t("authorityConfirmationPlaceholder")}
                          required
                          className="text-xs"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="w-fit"
                        >
                          {t("confirm")}
                        </Button>
                      </form>
                      <form
                        action={waiveFilingFormAction}
                        className="flex flex-col gap-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input type="hidden" name="filingId" value={row.id} />
                        <Textarea
                          name="waiverReason"
                          required
                          rows={2}
                          placeholder={t("waiverReasonPlaceholder")}
                          className="text-xs"
                        />
                        <Input
                          name="approvalReference"
                          required
                          placeholder={t("approvalReferencePlaceholder")}
                          className="text-xs"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="outline"
                          className="w-fit"
                        >
                          {t("waive")}
                        </Button>
                      </form>
                    </div>
                  </GovernedTrailingActionSlot>
                )
              },
            }
          : undefined
      }
    />
  )
}
