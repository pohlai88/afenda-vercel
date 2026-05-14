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

import { listTimeReportsForOrg, type OrgTimeReportRow } from "../server"

import { TimeReportCancelButton } from "./time-report-cancel-button"

const RECENT_STATES = ["approved", "rejected", "cancelled"] as const

type RecentState = (typeof RECENT_STATES)[number]

function formatDetail(row: OrgTimeReportRow): string {
  if (row.reportKind === "overtime") {
    const m = row.overtimeMinutes ?? 0
    return `${row.workDate ?? "—"} · ${m} min`
  }
  return `${row.tripStartDate ?? "—"} → ${row.tripEndDate ?? "—"}`
}

function isRecentState(value: string): value is RecentState {
  return (RECENT_STATES as readonly string[]).includes(value)
}

export async function TimeReportRecentTable({ isAdmin }: { isAdmin: boolean }) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.leave.timeReports")

  let rows: OrgTimeReportRow[]
  try {
    rows = await listTimeReportsForOrg(orgSession.organizationId, {
      states: [...RECENT_STATES],
      limit: 50,
    })
  } catch (err) {
    logUnexpectedServerError("time-report-recent-table: query failed", err, {
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
          <TableHead>{t("fieldEmployee")}</TableHead>
          <TableHead>{t("colReportType")}</TableHead>
          <TableHead>{t("colDetail")}</TableHead>
          <TableHead>{t("colState")}</TableHead>
          <TableHead>{t("colUpdated")}</TableHead>
          {isAdmin ? (
            <TableHead className="text-right">{t("colActions")}</TableHead>
          ) : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const detail = formatDetail(row)
          const stateLabel = isRecentState(row.state)
            ? t(`state.${row.state}`)
            : row.state
          const variant =
            row.state === "rejected"
              ? "destructive"
              : row.state === "approved"
                ? "success"
                : "outline"
          return (
            <TableRow key={row.id}>
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
                <Badge variant="outline">
                  {row.reportKind === "overtime"
                    ? t("reportKindOvertime")
                    : t("reportKindTrip")}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">{detail}</TableCell>
              <TableCell>
                <Badge variant={variant}>{stateLabel}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {(row.approvedAt ?? row.updatedAt).toLocaleString()}
              </TableCell>
              {isAdmin ? (
                <TableCell className="text-right">
                  {row.state === "approved" || row.state === "submitted" ? (
                    <TimeReportCancelButton reportId={row.id} detail={detail} />
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
