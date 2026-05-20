import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"

import { buildSftAttendanceReconcileListSurfaceConfiguration } from "../data/sft-surface-builders.server"
import { listSftAttendanceReconcileRowsForOrg } from "../data/sft-integration.server"
import { SFT_LIST_SURFACE_IDS } from "../data/sft-surface-metadata.shared"

function formatMinutes(minutes: number | null): string {
  if (minutes == null) return "—"
  return `${minutes} min`
}

export async function SftAttendanceCompareSection({
  organizationId,
  rangeStart,
  rangeEnd,
}: {
  organizationId: string
  rangeStart: string
  rangeEnd: string
}) {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")

  let rows: Awaited<ReturnType<typeof listSftAttendanceReconcileRowsForOrg>>
  try {
    rows = await listSftAttendanceReconcileRowsForOrg({
      organizationId,
      rangeStart,
      rangeEnd,
    })
  } catch (err) {
    logUnexpectedServerError("sft-attendance-compare: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("attendanceCompareTitle")}</CardTitle>
          <CardDescription>
            {t("attendanceCompareDescription", { rangeStart, rangeEnd })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={{
              dataNature: "table",
              surface: {
                header: { title: SFT_LIST_SURFACE_IDS.attendanceReconcile },
                columnsId: SFT_LIST_SURFACE_IDS.attendanceReconcile,
                rowKey: "id",
                empty: { variant: "muted", title: t("attendanceCompareEmpty") },
              },
              columns: [{ id: "employee", header: t("colEmployee") }],
              rows: [],
            }}
            surfaceKey="hrm:shift-scheduling:attendance-reconcile:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("attendanceCompareLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const listConfiguration = buildSftAttendanceReconcileListSurfaceConfiguration(
    rows,
    {
      empty: t("attendanceCompareEmpty"),
      colEmployee: t("colEmployee"),
      colDate: t("colDate"),
      colScheduled: t("colScheduledMinutes"),
      colActual: t("colActualMinutes"),
      colVariance: t("colVarianceMinutes"),
      formatMinutes,
    }
  )

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("attendanceCompareTitle")}</CardTitle>
        <CardDescription>
          {t("attendanceCompareDescription", { rangeStart, rangeEnd })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={listConfiguration}
          surfaceKey={SFT_LIST_SURFACE_IDS.attendanceReconcile}
          data-testid={`governed-list-section:${SFT_LIST_SURFACE_IDS.attendanceReconcile}`}
        />
      </CardContent>
    </Card>
  )
}
