import type { Route } from "next"

import { getFormatter, getTranslations } from "next-intl/server"

import { Button } from "#components2/ui/button"
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
import { Link } from "#i18n/navigation"
import { employeePortalPath } from "#lib/portal"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { listPayslipDocumentsForEmployee } from "../../documents-management/data/hrm-document.queries.server"

import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalPayslipsPageProps = {
  portalSlug: string
}

function detailPath(portalSlug: string, documentId: string): Route {
  return `${employeePortalPath(portalSlug, "payslips")}/${documentId}` as Route
}

export async function EmployeePortalPayslipsPage({
  portalSlug,
}: EmployeePortalPayslipsPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const [tLeave, navLabels, tPayroll, format, payslips] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getEmployeePortalSectionNavLabels(),
    getTranslations("Dashboard.Hrm.payroll"),
    getFormatter(),
    listPayslipDocumentsForEmployee(
      context.portal.organizationId,
      context.employee.id
    ),
  ])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {tLeave("portalEmployee", {
            employeeNumber: context.employee.employeeNumber,
          })}
        </p>
        <h1 className="text-2xl font-semibold tracking-normal">
          {tPayroll("portalPayslipsTitle")}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {tPayroll("portalPayslipsDescription")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="payslips"
        labels={navLabels}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {tPayroll("portalPayslipsCardTitle")}
          </CardTitle>
          <CardDescription>
            {tPayroll("portalPayslipsCardDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {tPayroll("portalPayslipsEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tPayroll("portalPayslipColTitle")}</TableHead>
                  <TableHead>{tPayroll("portalPayslipColPeriod")}</TableHead>
                  <TableHead>
                    {tPayroll("portalPayslipColPaymentDate")}
                  </TableHead>
                  <TableHead>{tPayroll("portalPayslipColNetPay")}</TableHead>
                  <TableHead>{tPayroll("portalPayslipColGrossPay")}</TableHead>
                  <TableHead>{tPayroll("portalPayslipColGenerated")}</TableHead>
                  <TableHead className="text-right">
                    {tPayroll("portalPayslipColActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">
                      {document.title}
                    </TableCell>
                    <TableCell>
                      {format.dateTime(
                        new Date(`${document.periodEnd}T00:00:00.000Z`),
                        {
                          dateStyle: "medium",
                        }
                      )}
                    </TableCell>
                    <TableCell>
                      {format.dateTime(
                        new Date(`${document.paymentDate}T00:00:00.000Z`),
                        {
                          dateStyle: "medium",
                        }
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {document.netPay} {document.currency}
                    </TableCell>
                    <TableCell>
                      {document.grossPay} {document.currency}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format.dateTime(document.uploadedAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={detailPath(
                            context.portal.portalSlug,
                            document.id
                          )}
                        >
                          {tPayroll("portalPayslipOpen")}
                        </Link>
                      </Button>
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
