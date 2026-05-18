import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import {
  buildTimeReportRecentListSurfaceConfiguration,
} from "../data/time-report-list-surface.server"
import { listTimeReportsForOrg } from "../data/time-report.queries.server"

const RECENT_STATES = ["approved", "rejected", "cancelled"] as const

export async function AttendanceTimeReportRecent() {
  const orgSession = await requireOrgSession()
  const [t, tAttendance] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave.timeReports"),
    getTranslations("Dashboard.Hrm.attendance"),
  ])

  let rows: Awaited<ReturnType<typeof listTimeReportsForOrg>>
  try {
    rows = await listTimeReportsForOrg(orgSession.organizationId, {
      states: [...RECENT_STATES],
      limit: 50,
    })
  } catch (err) {
    logUnexpectedServerError("attendance-time-report-recent: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: "hrm-time-report-recent" },
            columnsId: "hrm-time-report-recent",
            rowKey: "id",
            empty: { variant: "muted", title: t("recentEmpty") },
          },
          columns: [{ id: "employee", header: tAttendance("colEmployee") }],
          rows: [],
        }}
        surfaceKey="hrm:attendance:time-report-recent:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("recentLoadFailed"),
        }}
      />
    )
  }

  const reportKindLabelFor = (kind: string) =>
    kind === "overtime" ? t("reportKindOvertime") : t("reportKindTrip")

  const stateLabelFor = (state: string) => {
    if (state === "submitted") return t("state.submitted")
    if (state === "approved") return t("state.approved")
    if (state === "rejected") return t("state.rejected")
    if (state === "cancelled") return t("state.cancelled")
    return state
  }

  const listConfiguration = buildTimeReportRecentListSurfaceConfiguration(
    rows,
    {
      empty: t("recentEmpty"),
      colEmployee: tAttendance("colEmployee"),
      colReportType: t("colReportType"),
      colDetail: t("colDetail"),
      colState: t("colState"),
      colUpdated: t("colUpdated"),
      reportKindLabelFor,
      stateLabelFor,
    }
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:attendance:time-report-recent"
    />
  )
}
