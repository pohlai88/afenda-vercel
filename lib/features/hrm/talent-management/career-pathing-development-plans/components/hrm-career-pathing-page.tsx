import Link from "next/link"
import { getFormatter, getTranslations } from "next-intl/server"

import { GovernedPatternCListSection, ModulePageHeader } from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"
import { organizationAppsPath } from "#lib/org-apps-module-paths"

import { listActiveEmployeeChoicesForLeave } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import { countActiveCareerPathFrameworksForOrg } from "../data/career-path-framework.queries.server"
import {
  buildCareerPathFrameworksListSurfaceConfiguration,
  buildDashboardKpiSurfaceConfiguration,
  buildDevelopmentPlansListSurfaceConfiguration,
  buildPlanGoalsListSurfaceConfiguration,
  buildReadinessListSurfaceConfiguration,
  buildSkillGapsListSurfaceConfiguration,
  buildTargetRolesListSurfaceConfiguration,
} from "../data/career-pathing-list-surface.server"
import {
  countActivePlansForOrg,
  countOverdueMilestonesForOrg,
  listCareerDiscussionsForOrg,
  listDevelopmentPlansForOrg,
  listGoalsForPlan,
  listLatestReadinessForOrg,
  listSkillGapsForEmployee,
  listTargetRolesForOrg,
} from "../data/career-pathing.queries.server"
import { listCareerPathFrameworksForOrg } from "../data/career-path-framework.queries.server"

import {
  CareerDiscussionCreateForm,
  CareerPathFrameworkCreateForm,
  DevelopmentGoalCreateForm,
  DevelopmentPlanCreateForm,
  GoalStatusUpdateForm,
  LearningActionCreateForm,
  MentorAssignForm,
  StretchAssignmentCreateForm,
  TargetRoleCreateForm,
} from "./career-pathing-forms.client"

type HrmCareerPathingPageProps = {
  orgSlug: string
  isHrmAdmin: boolean
}

export async function HrmCareerPathingPage({
  orgSlug,
  isHrmAdmin,
}: HrmCareerPathingPageProps) {
  const session = await requireOrgSession()
  const organizationId = session.organizationId

  const [
    t,
    format,
    frameworks,
    targetRoles,
    plans,
    readiness,
    employees,
    activeFrameworks,
    activePlans,
    overdueMilestones,
    discussions,
  ] = await Promise.all([
    getTranslations("Dashboard.Hrm.careerPathing"),
    getFormatter(),
    listCareerPathFrameworksForOrg(organizationId),
    listTargetRolesForOrg(organizationId),
    listDevelopmentPlansForOrg(organizationId),
    listLatestReadinessForOrg(organizationId),
    listActiveEmployeeChoicesForLeave(organizationId),
    countActiveCareerPathFrameworksForOrg(organizationId),
    countActivePlansForOrg(organizationId),
    countOverdueMilestonesForOrg(organizationId),
    listCareerDiscussionsForOrg(organizationId),
  ])

  const employeeChoices = employees.map((e) => ({
    id: e.id,
    label: `${e.employeeNumber} — ${e.legalName}`,
  }))

  const nearReadyCount = readiness.filter(
    (r) => r.readinessLevel === "near_ready" || r.readinessLevel === "ready"
  ).length

  const primaryPlan = plans[0]
  const planGoals = primaryPlan
    ? await listGoalsForPlan(organizationId, primaryPlan.id)
    : []

  const gapEmployeeId = targetRoles[0]?.employeeId
  const skillGaps = gapEmployeeId
    ? await listSkillGapsForEmployee(organizationId, gapEmployeeId)
    : []

  const frameworkListConfig = buildCareerPathFrameworksListSurfaceConfiguration(
    frameworks,
    {
      title: t("frameworksTitle"),
      description: t("frameworksDescription"),
      empty: t("frameworksEmpty"),
      colCode: t("colCode"),
      colName: t("colName"),
      colKind: t("colKind"),
      colStatus: t("colStatus"),
      colStages: t("colStages"),
    }
  )

  const dashboardKpi = buildDashboardKpiSurfaceConfiguration({
    activeFrameworks,
    activePlans,
    overdueMilestones,
    nearReadyCount,
    labels: {
      frameworks: t("kpiFrameworks"),
      plans: t("kpiPlans"),
      overdue: t("kpiOverdue"),
      nearReady: t("kpiNearReady"),
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("dashboardTitle")}</CardTitle>
          <CardDescription>{t("dashboardDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            title={t("dashboardTitle")}
            description={t("dashboardDescription")}
            listConfiguration={dashboardKpi}
            surfaceKey="hrm:career-pathing:dashboard-kpi"
            layout="embedded"
            resolveConfiguredPermission={false}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("frameworksTitle")}</CardTitle>
          <CardDescription>{t("frameworksDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isHrmAdmin ? (
            <CareerPathFrameworkCreateForm
              organizationId={organizationId}
              orgSlug={orgSlug}
              labels={{
                submit: t("createFramework"),
                code: t("fieldCode"),
                name: t("fieldName"),
                kind: t("colKind"),
              }}
            />
          ) : null}
          <GovernedPatternCListSection
            title={t("frameworksTitle")}
            description={t("frameworksDescription")}
            listConfiguration={frameworkListConfig}
            surfaceKey="hrm:career-pathing:frameworks"
            layout="embedded"
            resolveConfiguredPermission={false}
          />
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("targetRolesTitle")}</CardTitle>
          <CardDescription>{t("targetRolesDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isHrmAdmin ? (
            <TargetRoleCreateForm
              organizationId={organizationId}
              orgSlug={orgSlug}
              employees={employeeChoices}
              labels={{
                submit: t("createTargetRole"),
                employee: t("fieldEmployee"),
                targetRole: t("fieldTargetRole"),
              }}
            />
          ) : null}
          <GovernedPatternCListSection
            title={t("targetRolesTitle")}
            description={t("targetRolesDescription")}
            listConfiguration={buildTargetRolesListSurfaceConfiguration(
              targetRoles,
              {
                title: t("targetRolesTitle"),
                description: t("targetRolesDescription"),
                empty: t("targetRolesEmpty"),
                colEmployee: t("colEmployee"),
                colTarget: t("fieldTargetRole"),
                colSource: t("colSource"),
                colFramework: t("colFramework"),
              }
            )}
            surfaceKey="hrm:career-pathing:target-roles"
            layout="embedded"
            resolveConfiguredPermission={false}
          />
        </CardContent>
      </Card>

      {gapEmployeeId ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("skillGapsTitle")}</CardTitle>
            <CardDescription>{t("skillGapsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <GovernedPatternCListSection
              title={t("skillGapsTitle")}
              description={t("skillGapsDescription")}
              listConfiguration={buildSkillGapsListSurfaceConfiguration(
                skillGaps,
                {
                  title: t("skillGapsTitle"),
                  description: t("skillGapsDescription"),
                  empty: t("skillGapsEmpty"),
                  colSkill: t("colSkill"),
                  colCurrent: t("colCurrent"),
                  colTarget: t("colTarget"),
                  colGap: t("colGap"),
                }
              )}
              surfaceKey="hrm:career-pathing:skill-gaps"
              layout="embedded"
              resolveConfiguredPermission={false}
            />
          </CardContent>
        </Card>
      ) : null}

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
            listConfiguration={buildDevelopmentPlansListSurfaceConfiguration(
              plans,
              {
                title: t("plansTitle"),
                description: t("plansDescription"),
                empty: t("plansEmpty"),
                colEmployee: t("colEmployee"),
                colTitle: t("fieldPlanTitle"),
                colStatus: t("colStatus"),
                colGoals: t("colGoals"),
                colOverdue: t("colOverdue"),
              }
            )}
            surfaceKey="hrm:career-pathing:plans"
            layout="embedded"
            resolveConfiguredPermission={false}
          />
          {primaryPlan && isHrmAdmin ? (
            <div className="flex flex-col gap-3 border-t pt-4">
              <p className="text-sm font-medium">
                {t("planGoalsTitle")}: {primaryPlan.title}
              </p>
              <DevelopmentGoalCreateForm
                organizationId={organizationId}
                orgSlug={orgSlug}
                planId={primaryPlan.id}
                labels={{
                  submit: t("createGoal"),
                  title: t("fieldGoalTitle"),
                  type: t("colGoalType"),
                }}
              />
              <GovernedPatternCListSection
                title={t("planGoalsTitle")}
                description={t("planGoalsDescription")}
                listConfiguration={buildPlanGoalsListSurfaceConfiguration(
                  planGoals,
                  {
                    empty: t("planGoalsEmpty"),
                    colTitle: t("fieldGoalTitle"),
                    colType: t("colGoalType"),
                    colStatus: t("colStatus"),
                    colMilestones: t("colMilestones"),
                    colDue: t("colDue"),
                    formatDue: (d) => format.dateTime(d, { dateStyle: "medium" }),
                  }
                )}
                surfaceKey="hrm:career-pathing:plan-goals"
                layout="embedded"
                resolveConfiguredPermission={false}
                trailingColumn={{
                  header: "",
                  render: (row) => (
                    <GovernedTrailingActionSlot>
                      <GoalStatusUpdateForm
                        organizationId={organizationId}
                        orgSlug={orgSlug}
                        goalId={row.id}
                        label={t("markInProgress")}
                      />
                    </GovernedTrailingActionSlot>
                  ),
                }}
              />
              {planGoals[0] ? (
                <LearningActionCreateForm
                  organizationId={organizationId}
                  orgSlug={orgSlug}
                  goalId={planGoals[0].id}
                  label={t("addLearningAction")}
                />
              ) : null}
              <StretchAssignmentCreateForm
                organizationId={organizationId}
                orgSlug={orgSlug}
                planId={primaryPlan.id}
                labels={{
                  submit: t("addStretch"),
                  title: t("fieldStretchTitle"),
                }}
              />
              <MentorAssignForm
                organizationId={organizationId}
                orgSlug={orgSlug}
                planId={primaryPlan.id}
                employees={employeeChoices}
                labels={{ submit: t("assignMentor"), mentor: t("fieldMentor") }}
              />
              <Link
                href={organizationAppsPath(orgSlug, "training")}
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                {t("trainingLink")}
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("discussionsTitle")}</CardTitle>
          <CardDescription>{t("discussionsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {isHrmAdmin ? (
            <CareerDiscussionCreateForm
              organizationId={organizationId}
              orgSlug={orgSlug}
              employees={employeeChoices}
              labels={{
                submit: t("createDiscussion"),
                employee: t("fieldEmployee"),
                date: t("fieldDiscussionDate"),
                notes: t("fieldNotes"),
              }}
            />
          ) : null}
          {discussions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("discussionsEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {discussions.map((d) => (
                <li key={d.id} className="rounded-md border px-3 py-2">
                  <span className="font-medium">{d.employeeName}</span>
                  {" — "}
                  {format.dateTime(
                    d.discussionDate instanceof Date
                      ? d.discussionDate
                      : new Date(d.discussionDate),
                    { dateStyle: "medium" }
                  )}
                  {d.notes ? (
                    <p className="mt-1 text-muted-foreground">{d.notes}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("readinessTitle")}</CardTitle>
          <CardDescription>{t("readinessDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            title={t("readinessTitle")}
            description={t("readinessDescription")}
            listConfiguration={buildReadinessListSurfaceConfiguration(readiness, {
              title: t("readinessTitle"),
              description: t("readinessDescription"),
              empty: t("readinessEmpty"),
              colEmployee: t("colEmployee"),
              colTarget: t("fieldTargetRole"),
              colReadiness: t("colReadiness"),
              colProgress: t("colProgress"),
            })}
            surfaceKey="hrm:career-pathing:readiness"
            layout="embedded"
            resolveConfiguredPermission={false}
          />
        </CardContent>
      </Card>
    </div>
  )
}
