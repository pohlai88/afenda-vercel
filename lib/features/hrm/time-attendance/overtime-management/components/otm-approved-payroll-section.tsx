import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import { HRM_OTM_DAY_CATEGORIES } from "../schemas/otm.schema"
import { buildOtmApprovedPayrollMarkListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { listOtmApprovedForPayrollMarking } from "../data/otm.queries.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import { OtmMarkPayrollReadyButton } from "./otm-mark-payroll-ready-button.client"
import type { HrmOtmDayCategory } from "../schemas/otm.schema"

export async function OtmApprovedPayrollSection({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  const format = await getFormatter()
  const rows = await listOtmApprovedForPayrollMarking(organizationId)

  const dayCategoryLabels = Object.fromEntries(
    HRM_OTM_DAY_CATEGORIES.map((category) => [
      category,
      t(`dayCategoryLabels.${category}` as `dayCategoryLabels.${HrmOtmDayCategory}`),
    ])
  ) as Record<HrmOtmDayCategory, string>

  const listConfiguration = buildOtmApprovedPayrollMarkListSurfaceConfiguration(
    rows,
    {
      empty: t("approvedPayrollEmpty"),
      colEmployee: t("colEmployee"),
      colWorkDate: t("colWorkDate"),
      colTimeRange: t("colTimeRange"),
      colDuration: t("colDuration"),
      colDayCategory: t("colDayCategory"),
      colState: t("colState"),
      colRequested: t("colRequested"),
      dayCategoryLabels,
      stateLabelFor: (state) =>
        t(`stateLabels.${state}` as `stateLabels.${typeof rows[number]["state"]}`),
      formatRequestedAt: (date) =>
        format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
    },
    { markPayrollLabel: t("markPayrollReady") }
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("approvedPayrollTitle")}</CardTitle>
        <CardDescription>{t("approvedPayrollDescription")}</CardDescription>
      </CardHeader>
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        description=""
        surfaceKey={OTM_LIST_SURFACE_IDS.approvedPayroll}
        listConfiguration={listConfiguration}
        trailingColumn={{
          header: t("colActions"),
          render: (surfaceRow) => {
            if (!isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)) {
              return null
            }
            return (
              <GovernedTrailingActionSlot trailingAction={surfaceRow.trailingAction}>
                <OtmMarkPayrollReadyButton requestId={surfaceRow.id} />
              </GovernedTrailingActionSlot>
            )
          },
        }}
      />
    </Card>
  )
}
