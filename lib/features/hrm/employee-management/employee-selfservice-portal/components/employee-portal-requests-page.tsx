import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { listEmployeePortalOpenRequests } from "../data/employee-portal-requests.queries.server"
import type { EmployeePortalOpenRequestKind } from "../data/employee-portal-requests.queries.server"

import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalRequestsPageProps = {
  portalSlug: string
}

function requestKindLabel(kind: EmployeePortalOpenRequestKind): string {
  const labels: Record<EmployeePortalOpenRequestKind, string> = {
    leave: "Leave",
    claim: "Expense claim",
    salary_advance: "Salary advance",
    benefit_enrollment: "Benefit enrollment",
    signature: "Signature",
    profile_update: "Profile update",
    document_request: "Document request",
    attendance_correction: "Attendance correction",
    training: "Training",
    onboarding_task: "Onboarding task",
    offboarding_task: "Offboarding task",
  }
  return labels[kind]
}

export async function EmployeePortalRequestsPage({
  portalSlug,
}: EmployeePortalRequestsPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id

  const [t, navLabels, requests] = await Promise.all([
    getTranslations("Dashboard.Hrm.portalRequests"),
    getEmployeePortalSectionNavLabels(),
    listEmployeePortalOpenRequests({ organizationId, employeeId }),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("eyebrow", {
            employeeNumber: context.employee.employeeNumber,
          })}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-normal">
            {t("pageTitle")}
          </h1>
          <Badge variant="outline">{context.employee.legalName}</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("pageDescription")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="requests"
        labels={navLabels}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("openRequestsTitle")}</CardTitle>
          <CardDescription>{t("openRequestsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("openRequestsEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colType")}</TableHead>
                  <TableHead>{t("colDetails")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                  <TableHead>{t("colSubmitted")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((row) => (
                  <TableRow key={`${row.kind}-${row.id}`}>
                    <TableCell>
                      <Badge variant="outline">
                        {requestKindLabel(row.kind)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {row.label}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.submittedAt.toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
