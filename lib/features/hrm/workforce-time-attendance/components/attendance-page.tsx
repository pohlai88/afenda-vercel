import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Skeleton } from "#components/ui/skeleton"
import { requireOrgSession } from "#lib/tenant"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import { isIsoDate, todayIsoDate } from "../../workforce-time-attendance/data/attendance-display.shared"
import { listActiveEmployeeChoicesForAttendance } from "../../server"

import { AttendanceDaySummary } from "./attendance-day-summary"
import { AttendanceDaySelector } from "./attendance-day-selector"
import { AttendanceRecentEvents } from "./attendance-recent-events"
import { AttendanceRecordEventDialog } from "./attendance-record-event-dialog"
import {
  AttendanceShiftAssignmentPanel,
  AttendanceShiftAssignmentPanelSkeleton,
} from "./attendance-shift-assignment-panel"

/**
 * Attendance management surface (Phase 4 — UI binding for the shipped
 * Phase 2C Server Actions). Composition responsibility:
 *
 *  - **Authority** is established by the parent layout (`requireOrgSession`
 *    via the workbench shell) and re-validated here for the admin gate.
 *  - **Tier A** (admin gate + employee picker + translations) sits in a
 *    single blocking `Promise.all` so the page renders the header + dialog
 *    trigger immediately.
 *  - **Tier B** (recent events log + per-day summary) streams behind
 *    Suspense boundaries — neither blocks first paint, and a failure in
 *    one section does not break the other.
 *
 * The day-summary is URL-driven (`?employeeId=…&date=YYYY-MM-DD`) so
 * deep links and refresh produce the same view. Members see a calm
 * read-only "admin-only" panel plus the recent-events log (no row
 * actions), so navigation remains useful but no privileged affordance
 * is rendered.
 */
type AttendancePageProps = {
  orgSlug: string
  employeeIdParam?: string
  dateParam?: string
}

export async function AttendancePage({
  orgSlug,
  employeeIdParam,
  dateParam,
}: AttendancePageProps) {
  const orgSession = await requireOrgSession()

  const [t, isAdmin, employees] = await Promise.all([
    getTranslations("Dashboard.Hrm.attendance"),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "attendance",
      function: "update",
    }),
    listActiveEmployeeChoicesForAttendance(orgSession.organizationId),
  ])

  const canRecord = isAdmin && employees.length > 0

  // Validate URL params against the active employee set + date shape so
  // the day-summary card never queries with attacker-controlled IDs.
  // `requireOrgSession` already proves the actor sees this org, but the
  // per-row tenant filter at the query layer remains the only source of
  // truth for IDOR — this validation is just defensive UX.
  const validEmployeeId =
    employeeIdParam && employees.some((e) => e.id === employeeIdParam)
      ? employeeIdParam
      : null
  const validDate = dateParam && isIsoDate(dateParam) ? dateParam : null
  const selectedDate = validDate ?? todayIsoDate()

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      {!isAdmin ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("memberRestrictedTitle")}</CardTitle>
            <CardDescription>{t("memberRestrictedBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {isAdmin && employees.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("noEmployeesTitle")}</CardTitle>
            <CardDescription>{t("noEmployeesBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("daySummaryTitle")}</CardTitle>
          <CardDescription>{t("daySummaryDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AttendanceDaySelector
            orgSlug={orgSlug}
            employees={employees}
            selectedEmployeeId={validEmployeeId}
            selectedDate={selectedDate}
          />
          {isAdmin && validEmployeeId ? (
            <Suspense fallback={<AttendanceShiftAssignmentPanelSkeleton />}>
              <AttendanceShiftAssignmentPanel
                organizationId={orgSession.organizationId}
                employeeId={validEmployeeId}
                attendanceDate={selectedDate}
              />
            </Suspense>
          ) : null}
          {validEmployeeId ? (
            <Suspense fallback={<AttendanceDaySummarySkeleton />}>
              <AttendanceDaySummary
                employeeId={validEmployeeId}
                attendanceDate={selectedDate}
                isAdmin={isAdmin}
              />
            </Suspense>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("daySelectorMissing")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("recentTitle")}</CardTitle>
          <CardDescription>{t("recentDescription")}</CardDescription>
          {canRecord ? (
            <CardAction>
              <AttendanceRecordEventDialog
                orgSlug={orgSlug}
                employees={employees}
              />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <Suspense fallback={<AttendanceTableSkeleton />}>
            <AttendanceRecentEvents isAdmin={isAdmin} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function AttendanceTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

function AttendanceDaySummarySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  )
}
