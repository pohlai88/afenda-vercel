import { getTranslations } from "next-intl/server"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildOtmEmbeddedListSurfaceErrorConfiguration } from "../data/otm-embedded-list-surface-error.server"
import { formatOvertimeDurationMinutes } from "../data/otm-display.shared"
import { buildOtmAttendanceReconcileListSurfaceConfiguration } from "../data/otm-surface-builders.server"
import { listOtmAttendanceReconcileRows } from "../data/otm.queries.server"
import { getOtmPolicyForOrg } from "../data/otm-policy.server"
import { OTM_LIST_SURFACE_IDS } from "../data/otm-surface-metadata.shared"

export async function OtmAttendanceReconcileSection({
  organizationId,
}: {
  organizationId: string
}) {
  const t = await getTranslations("Dashboard.Hrm.overtime")

  let policy: Awaited<ReturnType<typeof getOtmPolicyForOrg>>
  let rows: Awaited<ReturnType<typeof listOtmAttendanceReconcileRows>>
  try {
    ;[policy, rows] = await Promise.all([
      getOtmPolicyForOrg(organizationId),
      listOtmAttendanceReconcileRows(organizationId),
    ])
  } catch (err) {
    logUnexpectedServerError("otm-attendance-reconcile: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("attendanceReconcileTitle")}</CardTitle>
          <CardDescription>{t("attendanceReconcileDescription")}</CardDescription>
        </CardHeader>
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          description=""
          surfaceKey="hrm:overtime:attendance-reconcile:error"
          listConfiguration={buildOtmEmbeddedListSurfaceErrorConfiguration({
            columnsId: OTM_LIST_SURFACE_IDS.attendanceReconcile,
            emptyTitle: t("attendanceReconcileEmpty"),
            firstColumn: { id: "employee", header: t("colEmployee") },
          })}
          resolveConfiguredPermission={false}
          loadError={{
            variant: "error",
            title: t("attendanceReconcileLoadFailed"),
          }}
        />
      </Card>
    )
  }

  if (!policy.compareAttendanceEnabled) {
    return null
  }

  const listConfiguration = buildOtmAttendanceReconcileListSurfaceConfiguration(
    rows,
    {
      empty: t("attendanceReconcileEmpty"),
      colEmployee: t("colEmployee"),
      colWorkDate: t("colWorkDate"),
      colPayable: t("colPayable"),
      colAttendance: t("colAttendanceOt"),
      colVariance: t("colVariance"),
      formatMinutes: (minutes) =>
        minutes == null ? "—" : formatOvertimeDurationMinutes(minutes),
    }
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("attendanceReconcileTitle")}</CardTitle>
        <CardDescription>{t("attendanceReconcileDescription")}</CardDescription>
      </CardHeader>
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        description=""
        surfaceKey={OTM_LIST_SURFACE_IDS.attendanceReconcile}
        listConfiguration={listConfiguration}
        invalid={{
          variant: "error",
          title: t("attendanceReconcileLoadFailed"),
        }}
      />
    </Card>
  )
}
