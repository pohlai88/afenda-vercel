import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"

import {
  buildLeaveAbsenceCalendarListSurfaceConfiguration,
  type LeaveAbsenceCalendarDisplayRow,
} from "../data/leave-list-surface.server"
import {
  findLeaveEmployeeForUser,
  listAllLeaveRequestsForOrg,
  type OrgLeaveRequestRow,
} from "../data/leave-request.queries.server"

const ABSENCE_STATES = ["submitted", "approved", "taken"] as const

export async function LeaveAbsenceCalendar() {
  const [session, t] = await Promise.all([
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.leave"),
  ])
  const [canReadLeave, canManageLeave] = await Promise.all([
    canUseErpPermission({
      organizationId: session.organizationId,
      userId: session.userId,
      permission: { module: "hrm", object: "leave", function: "read" },
    }),
    canUseErpPermission({
      organizationId: session.organizationId,
      userId: session.userId,
      permission: { module: "hrm", object: "leave", function: "update" },
    }),
  ])
  const canReadOrgLeave = canReadLeave || canManageLeave
  const employee = canReadOrgLeave
    ? null
    : await findLeaveEmployeeForUser(session.organizationId, session.userId)

  if (!canReadOrgLeave && !employee) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("selfServiceNoEmployee")}
      </p>
    )
  }

  let rows: OrgLeaveRequestRow[]
  try {
    rows = await listAllLeaveRequestsForOrg(session.organizationId, {
      states: ABSENCE_STATES,
      limit: 100,
      employeeId: employee?.id,
    })
  } catch (err) {
    logUnexpectedServerError("leave-absence-calendar: query failed", err, {
      organizationId: session.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={buildLeaveAbsenceCalendarListSurfaceConfiguration(
          [],
          absenceCalendarCopy(t)
        )}
        surfaceKey="hrm:leave:absence-calendar:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("absenceLoadFailed"),
        }}
      />
    )
  }

  const listConfiguration = buildLeaveAbsenceCalendarListSurfaceConfiguration(
    rows.map((row) =>
      toAbsenceCalendarDisplayRow(row, (state) =>
        t(`state.${state}` as "state.draft")
      )
    ),
    absenceCalendarCopy(t)
  )

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:leave:absence-calendar"
      invalid={{
        variant: "error",
        title: t("absenceLoadFailed"),
      }}
    />
  )
}

function absenceCalendarCopy(t: Awaited<ReturnType<typeof getTranslations>>) {
  return {
    empty: t("absenceEmpty"),
    colEmployee: t("colEmployee"),
    colLeaveType: t("colLeaveType"),
    colDates: t("colDates"),
    colDuration: t("colDuration"),
    colState: t("colState"),
  }
}

function toAbsenceCalendarDisplayRow(
  row: OrgLeaveRequestRow,
  stateLabelFor: (state: string) => string
): LeaveAbsenceCalendarDisplayRow {
  return {
    id: row.id,
    employee: row.employeeFullName ?? row.employeeId,
    employeeNumber: row.employeeNumber,
    leaveType: row.leaveTypeCode ?? "-",
    dates:
      row.startDate === row.endDate
        ? row.startDate
        : `${row.startDate} -> ${row.endDate}`,
    duration: formatDays(row.durationDays),
    state: stateLabelFor(row.state),
  }
}

function formatDays(value: string): string {
  const days = Number(value)
  if (Number.isNaN(days)) return "-"
  return Number.isInteger(days) ? String(days) : days.toFixed(2)
}
