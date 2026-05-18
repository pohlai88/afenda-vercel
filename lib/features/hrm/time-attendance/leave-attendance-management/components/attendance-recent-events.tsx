import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import {
  type OrgAttendanceEventRow,
  listRecentAttendanceEventsForOrg,
} from "../../../server"
import {
  buildAttendanceRecentListSurfaceConfiguration,
  type AttendanceEventDisplayRow,
} from "../data/attendance-list-surface.server"

import { AttendanceCorrectionDialog } from "./attendance-correction-dialog"

const KNOWN_EVENT_TYPES = [
  "clock_in",
  "clock_out",
  "break_start",
  "break_end",
  "correction",
] as const

type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number]

const KNOWN_SOURCES = ["manual", "csv_import", "mobile", "device"] as const

type KnownSource = (typeof KNOWN_SOURCES)[number]

function isKnownEventType(value: string): value is KnownEventType {
  return (KNOWN_EVENT_TYPES as readonly string[]).includes(value)
}

function isKnownSource(value: string): value is KnownSource {
  return (KNOWN_SOURCES as readonly string[]).includes(value)
}

function formatEmployeeCell(row: OrgAttendanceEventRow): string {
  const name = row.employeeFullName ?? row.employeeId
  return row.employeeNumber ? `${name} · ${row.employeeNumber}` : name
}

function toDisplayRow(
  row: OrgAttendanceEventRow,
  labels: {
    eventLabelFor: (eventType: string) => string
    sourceLabelFor: (source: string) => string
    correctionShort: string
  }
): AttendanceEventDisplayRow {
  const isCorrection = row.correctionOfEventId !== null
  return {
    id: row.id,
    employee: formatEmployeeCell(row),
    eventType: labels.eventLabelFor(row.eventType),
    occurredAt: row.occurredAt.toISOString(),
    source: labels.sourceLabelFor(row.source),
    correction: isCorrection ? labels.correctionShort : "—",
  }
}

/**
 * Recent attendance events across the org — newest first. Streamed
 * behind a Suspense boundary on the attendance page so a slow query
 * does not block the header / day summary.
 */
export async function AttendanceRecentEvents({
  isAdmin,
}: {
  isAdmin: boolean
}) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.attendance")

  let rows: OrgAttendanceEventRow[]
  try {
    rows = await listRecentAttendanceEventsForOrg(orgSession.organizationId, {
      limit: 50,
    })
  } catch (err) {
    logUnexpectedServerError("attendance-recent-events: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: "hrm-attendance-recent-events" },
            columnsId: "hrm-attendance-recent-events",
            rowKey: "id",
            empty: { variant: "muted", title: t("recentEmpty") },
          },
          columns: [{ id: "employee", header: t("colEmployee") }],
          rows: [],
        }}
        surfaceKey="hrm:attendance:recent:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("recentLoadFailed"),
        }}
      />
    )
  }

  const eventLabelFor = (eventType: string) =>
    isKnownEventType(eventType) ? t(`eventType.${eventType}`) : eventType
  const sourceLabelFor = (source: string) =>
    isKnownSource(source) ? t(`eventSource.${source}`) : source

  const displayRows = rows.map((row) =>
    toDisplayRow(row, {
      eventLabelFor,
      sourceLabelFor,
      correctionShort: t("correctionShort"),
    })
  )

  const listConfiguration = buildAttendanceRecentListSurfaceConfiguration(
    displayRows,
    {
      columnsId: "hrm-attendance-recent-events",
      empty: t("recentEmpty"),
      colEmployee: t("colEmployee"),
      colEvent: t("colEvent"),
      colOccurredAt: t("colOccurredAt"),
      colSource: t("colSource"),
      colCorrectionOf: t("colCorrectionOf"),
    }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:attendance:recent-events"
      invalid={{
        variant: "error",
        title: t("recentLoadFailed"),
      }}
      trailingColumn={
        isAdmin
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const row = rowById.get(surfaceRow.id)
                if (!row) return null
                const isCorrection = row.correctionOfEventId !== null
                const isLockedOrCorrection =
                  isCorrection || row.eventType === "correction"
                if (isLockedOrCorrection) return null
                return (
                  <AttendanceCorrectionDialog
                    originalEventId={row.id}
                    occurredAtIso={row.occurredAt.toISOString()}
                    eventType={row.eventType}
                  />
                )
              },
            }
          : undefined
      }
    />
  )
}
