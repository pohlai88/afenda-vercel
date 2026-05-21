import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildOtmEmbeddedListSurfaceErrorConfiguration } from "../data/otm-embedded-list-surface-error.server"
import { buildOtmOrgRecentListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { getOtmDayCategoryLabelMap } from "../data/otm-section-labels.server"
import { listOtmRequestsForOrg } from "../data/otm.queries.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import { OtmExportReportButton } from "./otm-export-report-button.client"

export async function OtmReportSection({
  organizationId,
}: {
  organizationId: string
}) {
  const [t, format, dayCategoryLabels] = await Promise.all([
    getTranslations("Dashboard.Hrm.overtime"),
    getFormatter(),
    getOtmDayCategoryLabelMap(),
  ])

  let rows: Awaited<ReturnType<typeof listOtmRequestsForOrg>>
  try {
    rows = await listOtmRequestsForOrg(organizationId, { limit: 100 })
  } catch (err) {
    logUnexpectedServerError("otm-report: query failed", err, {
      organizationId,
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
          surfaceKey="hrm:overtime:report:error"
          listConfiguration={buildOtmEmbeddedListSurfaceErrorConfiguration({
            columnsId: OTM_LIST_SURFACE_IDS.report,
            emptyTitle: t("reportEmpty"),
            firstColumn: { id: "employee", header: t("colEmployee") },
          })}
          resolveConfiguredPermission={false}
          loadError={{
            variant: "error",
            title: t("reportLoadFailed"),
          }}
        />
      </Card>
    )
  }

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
      t(`stateLabels.${state}` as "stateLabels.submitted"),
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
        invalid={{
          variant: "error",
          title: t("reportLoadFailed"),
        }}
      />
    </Card>
  )
}
