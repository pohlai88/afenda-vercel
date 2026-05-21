import { getTranslations } from "next-intl/server"

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

  let rows: Awaited<ReturnType<typeof listOtmPayrollExportRows>>
  try {
    rows = await listOtmPayrollExportRows(organizationId)
  } catch (err) {
    logUnexpectedServerError("otm-payroll-ready: query failed", err, {
      organizationId,
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
          surfaceKey="hrm:overtime:payroll-ready:error"
          listConfiguration={buildOtmEmbeddedListSurfaceErrorConfiguration({
            columnsId: OTM_LIST_SURFACE_IDS.payrollReady,
            emptyTitle: t("payrollReadyEmpty"),
            firstColumn: { id: "employee", header: t("colEmployee") },
          })}
          resolveConfiguredPermission={false}
          loadError={{
            variant: "error",
            title: t("payrollReadyLoadFailed"),
          }}
        />
      </Card>
    )
  }

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
        invalid={{
          variant: "error",
          title: t("payrollReadyLoadFailed"),
        }}
      />
    </Card>
  )
}
