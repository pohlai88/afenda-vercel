import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildFwaReportListSurfaceConfiguration } from "../data/fwa-surface-builders.server"
import { listFwaRequestsForOrg } from "../data/fwa.queries.server"
import { FWA_LIST_SURFACE_IDS } from "../data/fwa-surface-metadata.shared"
import { FwaExportReportButton } from "./fwa-export-report-button.client"

export async function FwaOperationalReportSection({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("Dashboard.Hrm.flexibleWork")
  const format = await getFormatter()

  const rows = await listFwaRequestsForOrg(organizationId, { limit: 500 })

  const listConfiguration = buildFwaReportListSurfaceConfiguration(rows, {
    columnsId: FWA_LIST_SURFACE_IDS.report,
    empty: t("reportEmpty"),
    colEmployee: t("colEmployee"),
    colType: t("colType"),
    colDates: t("colDates"),
    colState: t("colState"),
    colRequested: t("colRequested"),
    formatRequestedAt: (date) =>
      format.dateTime(date, { dateStyle: "medium", timeStyle: "short" }),
    stateLabelFor: (state) =>
      t(`stateLabels.${state}` as "stateLabels.submitted"),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("reportTitle")}</CardTitle>
        <CardDescription>{t("reportDescription")}</CardDescription>
        <CardAction>
          <FwaExportReportButton />
        </CardAction>
      </CardHeader>
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        description=""
        surfaceKey="hrm:flexible-work:report"
        listConfiguration={listConfiguration}
      />
    </Card>
  )
}
