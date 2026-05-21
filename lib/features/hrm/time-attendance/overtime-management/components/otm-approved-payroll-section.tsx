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
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildOtmEmbeddedListSurfaceErrorConfiguration } from "../data/otm-embedded-list-surface-error.server"
import { buildOtmApprovedPayrollMarkListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { getOtmDayCategoryLabelMap } from "../data/otm-section-labels.server"
import { listOtmApprovedForPayrollMarking } from "../data/otm.queries.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"
import { OtmMarkPayrollReadyButton } from "./otm-mark-payroll-ready-button.client"

export async function OtmApprovedPayrollSection({
  organizationId,
}: {
  organizationId: string
}) {
  const [t, format, dayCategoryLabels] = await Promise.all([
    getTranslations("Dashboard.Hrm.overtime"),
    getFormatter(),
    getOtmDayCategoryLabelMap(),
  ])

  let rows: Awaited<ReturnType<typeof listOtmApprovedForPayrollMarking>>
  try {
    rows = await listOtmApprovedForPayrollMarking(organizationId)
  } catch (err) {
    logUnexpectedServerError("otm-approved-payroll: query failed", err, {
      organizationId,
    })
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
          surfaceKey="hrm:overtime:approved-payroll:error"
          listConfiguration={buildOtmEmbeddedListSurfaceErrorConfiguration({
            columnsId: OTM_LIST_SURFACE_IDS.approvedPayroll,
            emptyTitle: t("approvedPayrollEmpty"),
            firstColumn: { id: "employee", header: t("colEmployee") },
          })}
          resolveConfiguredPermission={false}
          loadError={{
            variant: "error",
            title: t("approvedPayrollLoadFailed"),
          }}
        />
      </Card>
    )
  }

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
        invalid={{
          variant: "error",
          title: t("approvedPayrollLoadFailed"),
        }}
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
