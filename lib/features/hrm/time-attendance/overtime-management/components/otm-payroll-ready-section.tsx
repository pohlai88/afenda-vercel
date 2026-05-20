import { getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"

import { buildOtmPayrollReadyListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { listOtmPayrollExportRows } from "../data/otm-payroll-export.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import { OtmExportReportButton } from "./otm-export-report-button.client"

export async function OtmPayrollReadySection({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")
  const rows = await listOtmPayrollExportRows(organizationId)

  const listConfiguration = buildOtmPayrollReadyListSurfaceConfiguration(rows, {
    empty: t("payrollReadyEmpty"),
    colEmployee: t("colEmployee"),
    colWorkDate: t("colWorkDate"),
    colPayable: t("colPayable"),
    colMultiplier: t("colMultiplier"),
    colEarning: t("colEarning"),
    colState: t("colState"),
    stateLabelFor: (state) =>
      t(`stateLabels.${state}` as `stateLabels.payroll_ready`),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("payrollReadyTitle")}</CardTitle>
        <CardDescription>{t("payrollReadyDescription")}</CardDescription>
        <CardAction>
          <OtmExportReportButton />
        </CardAction>
      </CardHeader>
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        description=""
        surfaceKey={OTM_LIST_SURFACE_IDS.payrollReady}
        listConfiguration={listConfiguration}
      />
    </Card>
  )
}
