import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import { attendanceEventTypeTone } from "../data/attendance-display.shared"
import {
  type OrgAttendanceEventRow,
  listRecentAttendanceEventsForOrg,
} from "../server"

import { AttendanceCorrectionDialog } from "./attendance-correction-dialog"

const KNOWN_EVENT_TYPES = [
  "clock_in",
  "clock_out",
  "break_start",
  "break_end",
  "correction",
] as const

type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number]

const TONE_BADGE: Record<
  string,
  "default" | "outline" | "secondary" | "destructive" | "success" | "info"
> = {
  positive: "success",
  info: "info",
  muted: "outline",
  neutral: "outline",
}

const KNOWN_SOURCES = ["manual", "csv_import", "mobile", "device"] as const

type KnownSource = (typeof KNOWN_SOURCES)[number]

function isKnownEventType(value: string): value is KnownEventType {
  return (KNOWN_EVENT_TYPES as readonly string[]).includes(value)
}

function isKnownSource(value: string): value is KnownSource {
  return (KNOWN_SOURCES as readonly string[]).includes(value)
}

/**
 * Recent attendance events across the org — newest first. Streamed
 * behind a Suspense boundary on the attendance page so a slow query
 * does not block the header / day summary.
 *
 * Failures degrade locally to a calm inline notice; we never throw out
 * of this section so the rest of the attendance surface keeps
 * rendering. Mirrors the leave-recent-table failure-isolation contract.
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
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("recentLoadFailed")}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("recentEmpty")}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colEmployee")}</TableHead>
          <TableHead>{t("colEvent")}</TableHead>
          <TableHead>{t("colOccurredAt")}</TableHead>
          <TableHead>{t("colSource")}</TableHead>
          <TableHead>{t("colCorrectionOf")}</TableHead>
          {isAdmin ? (
            <TableHead className="text-right">{t("colActions")}</TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const tone = attendanceEventTypeTone(row.eventType)
          const variant = TONE_BADGE[tone] ?? "outline"
          const eventLabel = isKnownEventType(row.eventType)
            ? t(`eventType.${row.eventType}`)
            : row.eventType
          const sourceLabel = isKnownSource(row.source)
            ? t(`eventSource.${row.source}`)
            : row.source
          const isCorrection = row.correctionOfEventId !== null
          const isLockedOrCorrection =
            isCorrection || row.eventType === "correction"

          return (
            <TableRow
              key={row.id}
              aria-label={
                isCorrection
                  ? t("correctionRowAria", {
                      original: row.correctionOfEventId ?? "",
                    })
                  : undefined
              }
            >
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {row.employeeFullName ?? row.employeeId}
                  </span>
                  {row.employeeNumber ? (
                    <span className="text-xs text-muted-foreground">
                      {row.employeeNumber}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant={variant}>{eventLabel}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.occurredAt.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{sourceLabel}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {isCorrection ? (
                  <span title={row.correctionReason ?? undefined}>
                    {t("correctionShort")}
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
              {isAdmin ? (
                <TableCell className="text-right">
                  {!isLockedOrCorrection ? (
                    <AttendanceCorrectionDialog
                      originalEventId={row.id}
                      occurredAtIso={row.occurredAt.toISOString()}
                      eventType={row.eventType}
                    />
                  ) : null}
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
