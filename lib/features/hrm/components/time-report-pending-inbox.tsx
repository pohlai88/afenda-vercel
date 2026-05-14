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
import { TimeReportDecisionForms } from "./time-report-decision-form"

function formatDetail(row: OrgTimeReportRow): string {
  if (row.reportKind === "overtime") {
    const m = row.overtimeMinutes ?? 0
    return `${row.workDate ?? "—"} · ${m} min`
  }
  return `${row.tripStartDate ?? "—"} → ${row.tripEndDate ?? "—"}`
}

export async function TimeReportPendingInbox({
  isAdmin,
}: {
  isAdmin: boolean
}) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.leave.timeReports")

  let rows: OrgTimeReportRow[]
  try {
    rows = await listTimeReportsForOrg(orgSession.organizationId, {
      states: ["submitted"],
      limit: 100,
    })
  } catch (err) {
    logUnexpectedServerError("time-report-pending-inbox: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("inboxLoadFailed")}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("inboxEmpty")}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("fieldEmployee")}</TableHead>
          <TableHead>{t("colReportType")}</TableHead>
          <TableHead>{t("colDetail")}</TableHead>
          <TableHead>{t("colRequested")}</TableHead>
          {isAdmin ? <TableHead>{t("colActions")}</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const detail = formatDetail(row)
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
              <TableCell className="text-xs text-muted-foreground">
                {row.requestedAt.toLocaleString()}
              </TableCell>
              {isAdmin ? (
                <TableCell>
                  <div className="flex flex-wrap items-center gap-2">
                    <TimeReportDecisionForms
                      reportId={row.id}
                      detail={detail}
                    />
                    <TimeReportCancelButton reportId={row.id} detail={detail} />
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
