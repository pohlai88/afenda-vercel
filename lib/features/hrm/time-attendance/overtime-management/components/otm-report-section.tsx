import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { HRM_OTM_DAY_CATEGORIES } from "../schemas/otm.schema"
import { buildOtmOrgRecentListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { listOtmRequestsForOrg } from "../data/otm.queries.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import { OtmExportReportButton } from "./otm-export-report-button.client"
import type { HrmOtmDayCategory } from "../schemas/otm.schema"

export async function OtmReportSection({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  const format = await getFormatter()
  const rows = await listOtmRequestsForOrg(organizationId, { limit: 100 })

  const dayCategoryLabels = Object.fromEntries(
    HRM_OTM_DAY_CATEGORIES.map((category) => [
      category,
      t(`dayCategoryLabels.${category}` as `dayCategoryLabels.${HrmOtmDayCategory}`),
    ])
  ) as Record<HrmOtmDayCategory, string>

  const listConfiguration = buildOtmOrgRecentListSurfaceConfiguration(rows, {
    columnsId: OTM_LIST_SURFACE_IDS.report,
    empty: t("reportEmpty"),
    colEmployee: t("colEmployee"),
    colWorkDate: t("colWorkDate"),
    colTimeRange: t("colTimeRange"),
    colDuration: t("colDuration"),
    colDayCategory: t("colDayCategory"),
    colState: t("colState"),
    colRequested: t("colRequested"),
    dayCategoryLabels,
    stateLabelFor: (state) =>
      t(`stateLabels.${state}` as `stateLabels.submitted`),
    formatRequestedAt: (date) =>
      format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("reportTitle")}</CardTitle>
        <CardDescription>{t("reportDescription")}</CardDescription>
        <CardAction>
          <OtmExportReportButton />
        </CardAction>
      </CardHeader>
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        description=""
        surfaceKey={OTM_LIST_SURFACE_IDS.report}
        listConfiguration={listConfiguration}
      />
    </Card>
  )
}
