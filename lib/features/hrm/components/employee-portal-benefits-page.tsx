import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"

import {
  listBenefitsAvailableToEmployee,
  listEnrollmentsForEmployee,
  listLifeEventsForEmployee,
} from "../data/benefit.queries.server"
import { listDependentsForEmployee } from "../data/dependent.queries.server"
import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalBenefitCancelButton } from "./employee-portal-benefit-cancel-button"
import { EmployeePortalBenefitEnrollForm } from "./employee-portal-benefit-enroll-form"
import { EmployeePortalBenefitLifeEventForm } from "./employee-portal-benefit-life-event-form"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type CoverageLevelKey =
  | "coverageLevel.employee_only"
  | "coverageLevel.employee_spouse"
  | "coverageLevel.employee_children"
  | "coverageLevel.employee_family"

const COVERAGE_LEVEL_KEY_MAP: Record<string, CoverageLevelKey> = {
  employee_only: "coverageLevel.employee_only",
  employee_spouse: "coverageLevel.employee_spouse",
  employee_children: "coverageLevel.employee_children",
  employee_family: "coverageLevel.employee_family",
}

type LifeEventTypeKey =
  | "lifeEventTypes.marriage"
  | "lifeEventTypes.divorce"
  | "lifeEventTypes.birth_adoption"
  | "lifeEventTypes.death_of_dependent"
  | "lifeEventTypes.loss_of_coverage"
  | "lifeEventTypes.spouse_job_loss"
  | "lifeEventTypes.change_in_employment_status"
  | "lifeEventTypes.other"

const LIFE_EVENT_TYPE_KEY_MAP: Record<string, LifeEventTypeKey> = {
  marriage: "lifeEventTypes.marriage",
  divorce: "lifeEventTypes.divorce",
  birth_adoption: "lifeEventTypes.birth_adoption",
  death_of_dependent: "lifeEventTypes.death_of_dependent",
  loss_of_coverage: "lifeEventTypes.loss_of_coverage",
  spouse_job_loss: "lifeEventTypes.spouse_job_loss",
  change_in_employment_status: "lifeEventTypes.change_in_employment_status",
  other: "lifeEventTypes.other",
}

type EmployeePortalBenefitsPageProps = {
  portalSlug: string
}

export async function EmployeePortalBenefitsPage({
  portalSlug,
}: EmployeePortalBenefitsPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const organizationId = context.portal.organizationId
  const employeeId = context.employee.id

  const [tLeave, t, navLabels, enrollments, available, lifeEvents, dependents] =
    await Promise.all([
      getTranslations("Dashboard.Hrm.leave"),
      getTranslations("Dashboard.Hrm.portalBenefits"),
      getEmployeePortalSectionNavLabels(),
      listEnrollmentsForEmployee(organizationId, employeeId),
      listBenefitsAvailableToEmployee(organizationId, employeeId),
      listLifeEventsForEmployee(organizationId, employeeId),
      listDependentsForEmployee(organizationId, employeeId),
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

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("availableTitle")}</CardTitle>
          <CardDescription>{t("availableDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeePortalBenefitEnrollForm
            portalSlug={portalSlug}
            availablePlans={available}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("coverageTitle")}</CardTitle>
          <CardDescription>{t("coverageDescription")}</CardDescription>
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
                  <TableHead className="text-right">
                    {t("colActions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((row) => (
                  <TableRow key={row.enrollmentId}>
                    <TableCell>{row.benefitName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.state}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.coverageLevel &&
                      COVERAGE_LEVEL_KEY_MAP[row.coverageLevel]
                        ? t(COVERAGE_LEVEL_KEY_MAP[row.coverageLevel]!)
                        : (row.coverageLevel ?? "—")}
                    </TableCell>
                    <TableCell>
                      {row.effectiveFrom instanceof Date
                        ? row.effectiveFrom.toISOString().slice(0, 10)
                        : row.effectiveFrom
                          ? String(row.effectiveFrom).slice(0, 10)
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.state === "pending" ? (
                        <EmployeePortalBenefitCancelButton
                          portalSlug={portalSlug}
                          enrollmentId={row.enrollmentId}
                        />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("lifeEventsTitle")}</CardTitle>
          <CardDescription>{t("lifeEventsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <EmployeePortalBenefitLifeEventForm portalSlug={portalSlug} />
          {lifeEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("lifeEventsEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("lifeEventColType")}</TableHead>
                  <TableHead>{t("lifeEventColDate")}</TableHead>
                  <TableHead>{t("lifeEventColStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lifeEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      {LIFE_EVENT_TYPE_KEY_MAP[event.eventType]
                        ? t(LIFE_EVENT_TYPE_KEY_MAP[event.eventType]!)
                        : event.eventType}
                    </TableCell>
                    <TableCell>
                      {event.eventDate instanceof Date
                        ? event.eventDate.toISOString().slice(0, 10)
                        : String(event.eventDate).slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {event.verificationStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("dependentsTitle")}</CardTitle>
          <CardDescription>{t("dependentsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {dependents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("dependentsEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("dependentColName")}</TableHead>
                  <TableHead>{t("dependentColRelationship")}</TableHead>
                  <TableHead>{t("dependentColTax")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dependents.map((dep) => (
                  <TableRow key={dep.id}>
                    <TableCell>{dep.legalName}</TableCell>
                    <TableCell>{dep.relationship}</TableCell>
                    <TableCell>
                      {dep.taxDependent ? t("yes") : t("no")}
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
