import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
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

import { listEnrollmentsForEmployee } from "../../../payroll-compensation/benefits-administration/data/benefit.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalBenefitsPageProps = {
  portalSlug: string
}

export async function EmployeePortalBenefitsPage({
  portalSlug,
}: EmployeePortalBenefitsPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const [tLeave, t, navLabels, enrollments] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    getTranslations("Dashboard.Hrm.portalBenefits"),
    getEmployeePortalSectionNavLabels(),
    listEnrollmentsForEmployee(
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
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-normal">
            {t("portalPageTitle")}
          </h1>
          <Badge variant="outline">{context.employee.legalName}</Badge>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {t("portalPageDescription")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="benefits"
        labels={navLabels}
      />

      <Alert>
        <AlertTitle>{t("bannerTitle")}</AlertTitle>
        <AlertDescription>{t("bannerBody")}</AlertDescription>
      </Alert>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("listTitle")}</CardTitle>
          <CardDescription>{t("portalPageDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("listEmpty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colPlan")}</TableHead>
                  <TableHead>{t("colState")}</TableHead>
                  <TableHead>{t("colCoverage")}</TableHead>
                  <TableHead>{t("colEffective")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((row) => (
                  <TableRow key={row.enrollmentId}>
                    <TableCell>{row.benefitName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.state}</Badge>
                    </TableCell>
                    <TableCell>{row.coverageLevel ?? "ÔÇö"}</TableCell>
                    <TableCell>
                      {row.effectiveFrom instanceof Date
                        ? row.effectiveFrom.toISOString().slice(0, 10)
                        : row.effectiveFrom
                          ? String(row.effectiveFrom).slice(0, 10)
                          : "ÔÇö"}
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
