import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listComplianceDashboardRowsForOrg } from "../data/compliance-dashboard.queries.server"

import { ComplianceEmployeeStatusListSection } from "./compliance-employee-status-list-section"

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
      <CardContent>
        <ComplianceEmployeeStatusListSection rows={topRows} />
      </CardContent>
    </Card>
  )
}
