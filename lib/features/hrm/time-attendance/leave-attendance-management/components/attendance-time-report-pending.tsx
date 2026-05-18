import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import {
  buildTimeReportPendingListSurfaceConfiguration,
} from "../data/time-report-list-surface.server"
import { listTimeReportsForOrg } from "../data/time-report.queries.server"

export async function AttendanceTimeReportPending() {
  const orgSession = await requireOrgSession()
  const [t, tAttendance] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave.timeReports"),
    getTranslations("Dashboard.Hrm.attendance"),
  ])

  let rows: Awaited<ReturnType<typeof listTimeReportsForOrg>>
  try {
    rows = await listTimeReportsForOrg(orgSession.organizationId, {
      states: ["submitted"],
      limit: 50,
    })
  } catch (err) {
    logUnexpectedServerError("attendance-time-report-pending: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: "hrm-time-report-pending" },
            columnsId: "hrm-time-report-pending",
            rowKey: "id",
            empty: { variant: "muted", title: t("inboxEmpty") },
          },
          columns: [{ id: "employee", header: tAttendance("colEmployee") }],
          rows: [],
        }}
        surfaceKey="hrm:attendance:time-report-pending:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("inboxLoadFailed"),
        }}
      />
    )
  }

  const reportKindLabelFor = (kind: string) =>
    kind === "overtime" ? t("reportKindOvertime") : t("reportKindTrip")

  const listConfiguration = buildTimeReportPendingListSurfaceConfiguration(
    rows,
    {
      empty: t("inboxEmpty"),
      colEmployee: tAttendance("colEmployee"),
      colReportType: t("colReportType"),
      colDetail: t("colDetail"),
      colRequested: t("colRequested"),
      reportKindLabelFor,
    }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:attendance:time-report-pending"
    />
  )
}
