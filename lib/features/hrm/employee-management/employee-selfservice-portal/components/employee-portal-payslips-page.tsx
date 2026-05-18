import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"

import { listPayslipDocumentsForEmployee } from "../../documents-management/data/hrm-document.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import {
  buildPayslipListSurfaceConfiguration,
  type PayslipListRowInput,
} from "../data/payslip-surface-builders.server"

import { EmployeePortalGovernedTable } from "./employee-portal-governed-table"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalPayslipsPageProps = {
  portalSlug: string
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

  const listRows: PayslipListRowInput[] = payslips.map((document) => ({
    id: document.id,
    title: document.title,
    periodEndLabel: format.dateTime(
      new Date(`${document.periodEnd}T00:00:00.000Z`),
      { dateStyle: "medium" }
    ),
    paymentDateLabel: format.dateTime(
      new Date(`${document.paymentDate}T00:00:00.000Z`),
      { dateStyle: "medium" }
    ),
    netPayLabel: `${document.netPay} ${document.currency}`,
    grossPayLabel: `${document.grossPay} ${document.currency}`,
    generatedAtLabel: format.dateTime(document.uploadedAt, {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  }))

  const listConfiguration = buildPayslipListSurfaceConfiguration(
    listRows,
    context.portal.portalSlug,
    {
      eyebrow: tPayroll("portalPayslipsCardTitle"),
      title: tPayroll("portalPayslipsCardTitle"),
      description: tPayroll("portalPayslipsCardDescription"),
      empty: tPayroll("portalPayslipsEmpty"),
      colTitle: tPayroll("portalPayslipColTitle"),
      colPeriod: tPayroll("portalPayslipColPeriod"),
      colPaymentDate: tPayroll("portalPayslipColPaymentDate"),
      colNetPay: tPayroll("portalPayslipColNetPay"),
      colGrossPay: tPayroll("portalPayslipColGrossPay"),
      colGenerated: tPayroll("portalPayslipColGenerated"),
    }
  )

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
          <EmployeePortalGovernedTable
            configuration={listConfiguration}
            surfaceKey="hrm:portal:payslips"
          />
        </CardContent>
      </Card>
    </div>
  )
}
