import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import { listActiveEmployeeChoicesForLeave } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import { buildCareerPathingEmbeddedListSurfaceErrorConfiguration } from "../data/career-pathing-embedded-list-surface-error.server"
import { buildDevelopmentPlansListSurfaceConfiguration } from "../data/career-pathing-list-surface.server"
import { listDevelopmentPlansForOrg } from "../data/career-pathing.queries.server"
import { resolveCareerPathingSelectedId } from "../data/career-pathing-selection.shared"
import { CAREER_PATHING_LIST_SURFACE_IDS } from "../data/career-pathing-surface-metadata.shared"
import { DevelopmentPlanCreateForm } from "./career-pathing-forms.client"
import type { CareerPathingSectionProps } from "./career-pathing-section-props.shared"
import { CareerPathingPrimaryPlanSection } from "./career-pathing-primary-plan-section"
import { CareerPathingPlanPicker } from "./career-pathing-query-pickers.client"

export async function CareerPathingPlansSection({
  organizationId,
  orgSlug,
  isHrmAdmin,
  selectedPlanId,
}: CareerPathingSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.careerPathing")

  let plans: Awaited<ReturnType<typeof listDevelopmentPlansForOrg>>
  let employees: Awaited<ReturnType<typeof listActiveEmployeeChoicesForLeave>>

  try {
    ;[plans, employees] = await Promise.all([
      listDevelopmentPlansForOrg(organizationId),
      listActiveEmployeeChoicesForLeave(organizationId),
    ])
  } catch (err) {
    logUnexpectedServerError("career-pathing-plans: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("plansTitle")}</CardTitle>
          <CardDescription>{t("plansDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildCareerPathingEmbeddedListSurfaceErrorConfiguration({
              columnsId: CAREER_PATHING_LIST_SURFACE_IDS.plans,
              emptyTitle: t("plansEmpty"),
              firstColumn: { id: "title", header: t("fieldPlanTitle") },
            })}
            surfaceKey="hrm:career-pathing:plans:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("plansLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const employeeChoices = employees.map((employee) => ({
    id: employee.id,
    label: `${employee.employeeNumber} — ${employee.legalName}`,
  }))

  const planPickerOptions = plans.map((plan) => ({
    id: plan.id,
    label: `${plan.employeeName} — ${plan.title}`,
  }))

  const activePlanId = resolveCareerPathingSelectedId(plans, selectedPlanId)
  const activePlan = plans.find((plan) => plan.id === activePlanId)

  const listConfiguration = buildDevelopmentPlansListSurfaceConfiguration(plans, {
    title: t("plansTitle"),
    description: t("plansDescription"),
    empty: t("plansEmpty"),
    colEmployee: t("colEmployee"),
    colTitle: t("fieldPlanTitle"),
    colStatus: t("colStatus"),
    colGoals: t("colGoals"),
    colOverdue: t("colOverdue"),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("plansTitle")}</CardTitle>
        <CardDescription>{t("plansDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isHrmAdmin ? (
          <DevelopmentPlanCreateForm
            organizationId={organizationId}
            orgSlug={orgSlug}
            employees={employeeChoices}
            labels={{
              submit: t("createPlan"),
              employee: t("fieldEmployee"),
              title: t("fieldPlanTitle"),
            }}
          />
        ) : null}
        <GovernedPatternCListSection
          title={t("plansTitle")}
          description={t("plansDescription")}
          listConfiguration={listConfiguration}
          surfaceKey="hrm:career-pathing:plans"
          layout="embedded"
          resolveConfiguredPermission={false}
        />
        {isHrmAdmin && plans.length > 0 ? (
          <Suspense fallback={null}>
            <CareerPathingPlanPicker
              plans={planPickerOptions}
              selectedPlanId={activePlanId}
              label={t("selectPlan")}
            />
          </Suspense>
        ) : null}
        {activePlan && isHrmAdmin ? (
          <CareerPathingPrimaryPlanSection
            organizationId={organizationId}
            orgSlug={orgSlug}
            plan={activePlan}
            employeeChoices={employeeChoices}
          />
        ) : null}
      </CardContent>
    </Card>
  )
}
