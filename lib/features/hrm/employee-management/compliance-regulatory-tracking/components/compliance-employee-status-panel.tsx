import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listComplianceDashboardRowsForOrg } from "../data/compliance-dashboard.queries.server"

type ComplianceEmployeeStatusPanelProps = {
  readonly organizationId: string
}

export async function ComplianceEmployeeStatusPanel({
  organizationId,
}: ComplianceEmployeeStatusPanelProps) {
  const rows = await listComplianceDashboardRowsForOrg(organizationId)
  const topRows = rows.slice(0, 12)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">Employee compliance posture</CardTitle>
        <CardDescription>
          Highest-risk employees based on work eligibility, documents, training,
          acknowledgements, and open exceptions.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {topRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active employees are in scope for compliance tracking.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border text-sm">
            {topRows.map((row) => (
              <li key={row.employeeId} className="flex flex-col gap-2 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {row.employeeNumber} · {row.legalName}
                  </span>
                  <Badge variant="outline">{row.overallStatus}</Badge>
                  {row.openExceptionCount > 0 ? (
                    <Badge variant="destructive">
                      {row.openExceptionCount} open
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {row.legalEntityCode ?? "No entity"} ·{" "}
                  {row.workLocationCode ?? "No location"} ·{" "}
                  {row.employmentType ?? "No employment type"} ·{" "}
                  {row.workerCategory ?? "No worker category"}
                </p>
                <p className="text-xs text-muted-foreground">
                  missing docs {row.documentMissing} · expired docs{" "}
                  {row.documentExpired} · overdue training{" "}
                  {row.trainingOverdue} · missing policy{" "}
                  {row.missingAcknowledgementCount}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
