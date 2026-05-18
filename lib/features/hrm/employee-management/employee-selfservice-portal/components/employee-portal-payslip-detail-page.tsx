import { after } from "next/server"
import { notFound } from "next/navigation"

import { getFormatter, getTranslations } from "next-intl/server"

import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { Link } from "#i18n/navigation"
import { employeePortalPath } from "#lib/portal"

import { getPayslipDocumentForEmployee } from "../../documents-management/data/hrm-document.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { buildPayslipLinesSurfaceConfiguration } from "../data/payslip-surface-builders.server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalPayslipDetailPageProps = {
  portalSlug: string
  documentId: string
}

function formatIsoDate(
  formatter: Awaited<ReturnType<typeof getFormatter>>,
  value: string
): string {
  return formatter.dateTime(new Date(`${value}T00:00:00.000Z`), {
    dateStyle: "medium",
  })
}

export async function EmployeePortalPayslipDetailPage({
  portalSlug,
  documentId,
}: EmployeePortalPayslipDetailPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const document = await getPayslipDocumentForEmployee({
    organizationId: context.portal.organizationId,
    employeeId: context.employee.id,
    documentId,
  })

  if (!document) {
    notFound()
  }

  const [tLeave, navLabels, tPayroll, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getEmployeePortalSectionNavLabels(),
    getTranslations("Dashboard.Hrm.payroll"),
    getFormatter(),
  ])

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "iam.portal.employee.payslip.view",
      organizationId: context.portal.organizationId,
      actorUserId: context.portal.userId,
      actorSessionId: context.portal.sessionId,
      resourceType: "hrm_document",
      resourceId: document.id,
      metadata: {
        portalId: context.portal.portalId,
        portalSlug: context.portal.portalSlug,
        audience: context.portal.portalAudience,
        subjectId: context.employee.id,
        payrollRunId: document.snapshot.runId,
        payrollPeriodId: document.snapshot.periodId,
      },
    })
  )

  const linesConfiguration = buildPayslipLinesSurfaceConfiguration(
    document.snapshot,
    {
      eyebrow: tPayroll("portalPayslipLinesTitle"),
      title: tPayroll("portalPayslipLinesTitle"),
      description: document.title,
      colKind: tPayroll("portalPayslipLineKind"),
      colCode: tPayroll("portalPayslipLineCode"),
      colDescription: tPayroll("portalPayslipLineDescription"),
      colAmount: tPayroll("portalPayslipLineAmount"),
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
          {tPayroll("portalPayslipDetailTitle")}
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {tPayroll("portalPayslipDetailDescription")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="payslips"
        labels={navLabels}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link
            href={employeePortalPath(context.portal.portalSlug, "payslips")}
          >
            {tPayroll("portalPayslipBackToList")}
          </Link>
        </Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {tPayroll("portalPayslipLinesTitle")}
            </CardTitle>
            <CardDescription>{document.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <GovernedPatternCListSection
              layout="embedded"
              title=""
              listConfiguration={linesConfiguration}
              surfaceKey="hrm:portal:payslip-lines"
              resolveConfiguredPermission={false}
            />
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {tPayroll("portalPayslipSummaryTitle")}
            </CardTitle>
            <CardDescription>
              {tPayroll("portalPayslipSummaryDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">
                  {tPayroll("portalPayslipEmployeeLabel")}
                </dt>
                <dd className="font-medium">
                  {document.snapshot.employeeLegalName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {tPayroll("portalPayslipPeriodLabel")}
                </dt>
                <dd className="font-medium">
                  {formatIsoDate(format, document.snapshot.periodStart)} -{" "}
                  {formatIsoDate(format, document.snapshot.periodEnd)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {tPayroll("portalPayslipPaymentDateLabel")}
                </dt>
                <dd className="font-medium">
                  {formatIsoDate(format, document.snapshot.paymentDate)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {tPayroll("portalPayslipGeneratedAtLabel")}
                </dt>
                <dd className="font-medium">
                  {format.dateTime(new Date(document.snapshot.generatedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {tPayroll("portalPayslipGrossPayLabel")}
                </dt>
                <dd className="font-medium">
                  {document.snapshot.grossPay} {document.snapshot.currency}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {tPayroll("portalPayslipNetPayLabel")}
                </dt>
                <dd className="font-medium">
                  {document.snapshot.netPay} {document.snapshot.currency}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {tPayroll("portalPayslipEmployerCostLabel")}
                </dt>
                <dd className="font-medium">
                  {document.snapshot.employerCost} {document.snapshot.currency}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {tPayroll("portalPayslipRulePackLabel")}
                </dt>
                <dd className="font-medium">
                  {document.snapshot.rulePackVersion ?? "—"}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
