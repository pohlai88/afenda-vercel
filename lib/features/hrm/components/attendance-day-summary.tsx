import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import {
  attendanceDayStateTone,
  formatMinutesAsHoursMinutes,
} from "../data/attendance-display.shared"
import {
  type AttendanceDayRow,
  getAttendanceDay,
} from "../data/attendance.queries.server"
import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"
import { and, eq } from "drizzle-orm"

import { AttendanceRegenerateDayButton } from "./attendance-regenerate-day-button"

const TONE_BADGE: Record<
  string,
  "default" | "outline" | "secondary" | "destructive" | "success" | "info"
> = {
  positive: "success",
  info: "info",
  muted: "outline",
  neutral: "outline",
}

const KNOWN_DAY_STATES = ["open", "computed", "locked"] as const

type KnownDayState = (typeof KNOWN_DAY_STATES)[number]

function isKnownDayState(value: string): value is KnownDayState {
  return (KNOWN_DAY_STATES as readonly string[]).includes(value)
}

/**
 * Per-employee, per-date attendance day summary streamed behind a
 * Suspense boundary on the attendance page. Read-only rendering; all
 * mutations happen via the {@link AttendanceRegenerateDayButton} or via
 * the record / correction dialogs in the recent-events table.
 *
 * Tenant guard: `requireOrgSession` proves the actor sees this org;
 * the underlying query filters on `organizationId`. The page composer
 * already validates the `employeeId` against the active employee
 * picker before mounting this component, so an attacker cannot drive
 * a cross-tenant lookup through search params.
 */
export async function AttendanceDaySummary({
  employeeId,
  attendanceDate,
  isAdmin,
}: {
  employeeId: string
  attendanceDate: string
  isAdmin: boolean
}) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.attendance")

  let row: AttendanceDayRow | null
  let employeeName: string | null = null
  try {
    const [day, employee] = await Promise.all([
      getAttendanceDay({
        organizationId: orgSession.organizationId,
        employeeId,
        attendanceDate,
      }),
      db
        .select({ legalName: hrmEmployee.legalName })
        .from(hrmEmployee)
        .where(
          and(
            eq(hrmEmployee.organizationId, orgSession.organizationId),
            eq(hrmEmployee.id, employeeId)
          )
        )
        .limit(1),
    ])
    row = day
    employeeName = employee[0]?.legalName ?? null
  } catch (err) {
    logUnexpectedServerError(
      "attendance-day-summary: query failed",
      err,
      {
        organizationId: orgSession.organizationId,
        employeeId,
        attendanceDate,
      }
    )
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("daySummaryLoadFailed")}
      </p>
    )
  }

  if (!row) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("daySummaryEmpty")}</p>
        <p className="text-xs text-muted-foreground">
          {t("daySummaryEmptyHint")}
        </p>
        {isAdmin ? (
          <AttendanceRegenerateDayButton
            employeeId={employeeId}
            employeeName={employeeName ?? employeeId}
            attendanceDate={attendanceDate}
          />
        ) : null}
      </div>
    )
  }

  const stateTone = attendanceDayStateTone(row.state)
  const stateVariant = TONE_BADGE[stateTone] ?? "outline"
  const stateLabel = isKnownDayState(row.state)
    ? t(`state.${row.state}`)
    : row.state
  const isLocked = row.state === "locked"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <Badge variant={stateVariant}>{stateLabel}</Badge>
        {row.absenceCode ? (
          <Badge variant="outline">
            {t("absenceCodeLabel")} · {row.absenceCode}
          </Badge>
        ) : null}
        {isAdmin && !isLocked ? (
          <div className="ml-auto">
            <AttendanceRegenerateDayButton
              employeeId={employeeId}
              employeeName={employeeName ?? employeeId}
              attendanceDate={attendanceDate}
            />
          </div>
        ) : null}
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <SummaryStat
          label={t("metricFirstClockIn")}
          value={
            row.firstClockInAt
              ? row.firstClockInAt.toLocaleTimeString()
              : t("noClockTime")
          }
        />
        <SummaryStat
          label={t("metricLastClockOut")}
          value={
            row.lastClockOutAt
              ? row.lastClockOutAt.toLocaleTimeString()
              : t("noClockTime")
          }
        />
        <SummaryStat
          label={t("metricWorkedMinutes")}
          value={formatMinutesAsHoursMinutes(row.workedMinutes)}
        />
        <SummaryStat
          label={t("metricBreakMinutes")}
          value={formatMinutesAsHoursMinutes(row.breakMinutes)}
        />
        <SummaryStat
          label={t("metricLateMinutes")}
          value={formatMinutesAsHoursMinutes(row.lateMinutes)}
        />
        <SummaryStat
          label={t("metricEarlyOutMinutes")}
          value={formatMinutesAsHoursMinutes(row.earlyOutMinutes)}
        />
        <SummaryStat
          label={t("metricOvertimeMinutes")}
          value={formatMinutesAsHoursMinutes(row.overtimeMinutes)}
        />
        <SummaryStat
          label={t("metricScheduledMinutes")}
          value={formatMinutesAsHoursMinutes(row.scheduledMinutes)}
        />
        <SummaryStat
          label={t("metricLastUpdated")}
          value={row.updatedAt.toLocaleString()}
        />
      </dl>

      {row.derivedFromEventChecksum ? (
        <p className="text-xs text-muted-foreground">
          {t("metricEventChecksum")} ·{" "}
          <code className="font-mono">
            {row.derivedFromEventChecksum.slice(0, 12)}…
          </code>
        </p>
      ) : null}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}
