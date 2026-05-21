import Link from "next/link"
import { getFormatter, getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"

import { organizationHrmPath } from "../../../constants"
import { buildCareerPathingEmbeddedListSurfaceErrorConfiguration } from "../data/career-pathing-embedded-list-surface-error.server"
import {
  buildLearningActionsListSurfaceConfiguration,
  buildPlanGoalsListSurfaceConfiguration,
  buildStretchAssignmentsListSurfaceConfiguration,
} from "../data/career-pathing-list-surface.server"
import type { DevelopmentPlanRow } from "../data/career-pathing.types.shared"
import {
  listGoalsForPlan,
  listLearningActionsForPlan,
  listStretchAssignmentsForPlan,
} from "../data/career-pathing.queries.server"
import { CAREER_PATHING_LIST_SURFACE_IDS } from "../data/career-pathing-surface-metadata.shared"
import {
  CoachAssignForm,
  DevelopmentGoalCreateForm,
  DevelopmentSessionCreateForm,
  GoalStatusUpdateForm,
  LearningActionCreateForm,
  ManagerReviewUpdateForm,
  MentorAssignForm,
  StretchAssignmentCreateForm,
} from "./career-pathing-forms.client"
import type { CareerPathingEmployeeChoice } from "./career-pathing-section-props.shared"

export async function CareerPathingPrimaryPlanSection({
  organizationId,
  orgSlug,
  plan,
  employeeChoices,
}: {
  organizationId: string
  orgSlug: string
  plan: DevelopmentPlanRow
  employeeChoices: readonly CareerPathingEmployeeChoice[]
}) {
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.careerPathing"),
    getFormatter(),
  ])

  let planGoals: Awaited<ReturnType<typeof listGoalsForPlan>> = []
  let planLearningActions: Awaited<ReturnType<typeof listLearningActionsForPlan>> = []
  let planStretchAssignments: Awaited<
    ReturnType<typeof listStretchAssignmentsForPlan>
  > = []
  let planDetailLoadFailed = false

  try {
    ;[planGoals, planLearningActions, planStretchAssignments] = await Promise.all([
      listGoalsForPlan(organizationId, plan.id),
      listLearningActionsForPlan(organizationId, plan.id),
      listStretchAssignmentsForPlan(organizationId, plan.id),
    ])
  } catch (err) {
    logUnexpectedServerError("career-pathing-primary-plan: detail failed", err, {
      organizationId,
      planId: plan.id,
    })
    planDetailLoadFailed = true
  }

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <p className="text-sm font-medium">
        {t("planGoalsTitle")}: {plan.title}
      </p>
      <DevelopmentGoalCreateForm
        organizationId={organizationId}
        orgSlug={orgSlug}
        planId={plan.id}
        labels={{
          submit: t("createGoal"),
          title: t("fieldGoalTitle"),
          type: t("colGoalType"),
        }}
      />
      {planDetailLoadFailed ? (
        <GovernedPatternCListSection
          layout="embedded"
          title=""
          listConfiguration={buildCareerPathingEmbeddedListSurfaceErrorConfiguration({
            columnsId: CAREER_PATHING_LIST_SURFACE_IDS.planGoals,
            emptyTitle: t("planGoalsEmpty"),
            firstColumn: { id: "title", header: t("fieldGoalTitle") },
          })}
          surfaceKey="hrm:career-pathing:plan-goals:error"
          resolveConfiguredPermission={false}
          loadError={{
            variant: "error",
            title: t("planGoalsLoadFailed"),
          }}
        />
      ) : (
        <GovernedPatternCListSection
          title={t("planGoalsTitle")}
          description={t("planGoalsDescription")}
          listConfiguration={buildPlanGoalsListSurfaceConfiguration(planGoals, {
            empty: t("planGoalsEmpty"),
            colTitle: t("fieldGoalTitle"),
            colType: t("colGoalType"),
            colStatus: t("colStatus"),
            colMilestones: t("colMilestones"),
            colDue: t("colDue"),
            formatDue: (date) => format.dateTime(date, { dateStyle: "medium" }),
          })}
          surfaceKey="hrm:career-pathing:plan-goals"
          layout="embedded"
          resolveConfiguredPermission={false}
          trailingColumn={{
            header: "",
            render: (surfaceRow) => {
              if (!isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)) {
                return null
              }
              return (
                <GovernedTrailingActionSlot trailingAction={surfaceRow.trailingAction}>
                  <GoalStatusUpdateForm
                    organizationId={organizationId}
                    orgSlug={orgSlug}
                    goalId={surfaceRow.id}
                    label={t("markInProgress")}
                  />
                </GovernedTrailingActionSlot>
              )
            },
          }}
        />
      )}
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
        planId={plan.id}
        labels={{
          submit: t("addStretch"),
          title: t("fieldStretchTitle"),
        }}
      />
      {!planDetailLoadFailed ? (
        <>
          <GovernedPatternCListSection
            title={t("learningActionsTitle")}
            description={t("learningActionsDescription")}
            listConfiguration={buildLearningActionsListSurfaceConfiguration(
              planLearningActions,
              {
                title: t("learningActionsTitle"),
                description: t("learningActionsDescription"),
                empty: t("learningActionsEmpty"),
                colTitle: t("fieldGoalTitle"),
                colGoal: t("colLinkedGoal"),
                colCourse: t("colCourse"),
                colStatus: t("colStatus"),
              }
            )}
            surfaceKey="hrm:career-pathing:learning-actions"
            layout="embedded"
            resolveConfiguredPermission={false}
          />
          <GovernedPatternCListSection
            title={t("stretchAssignmentsTitle")}
            description={t("stretchAssignmentsDescription")}
            listConfiguration={buildStretchAssignmentsListSurfaceConfiguration(
              planStretchAssignments,
              {
                title: t("stretchAssignmentsTitle"),
                description: t("stretchAssignmentsDescription"),
                empty: t("stretchAssignmentsEmpty"),
                colTitle: t("fieldStretchTitle"),
                colKind: t("colStretchKind"),
                colStatus: t("colStatus"),
              }
            )}
            surfaceKey="hrm:career-pathing:stretch-assignments"
            layout="embedded"
            resolveConfiguredPermission={false}
          />
        </>
      ) : null}
      <DevelopmentSessionCreateForm
        organizationId={organizationId}
        orgSlug={orgSlug}
        planId={plan.id}
        labels={{
          submit: t("recordSession"),
          kind: t("fieldSessionKind"),
          date: t("fieldSessionDate"),
        }}
      />
      <ManagerReviewUpdateForm
        organizationId={organizationId}
        orgSlug={orgSlug}
        planId={plan.id}
        labels={{
          submit: t("saveManagerReview"),
          note: t("fieldManagerReview"),
        }}
      />
      <MentorAssignForm
        organizationId={organizationId}
        orgSlug={orgSlug}
        planId={plan.id}
        employees={employeeChoices}
        labels={{ submit: t("assignMentor"), mentor: t("fieldMentor") }}
      />
      <CoachAssignForm
        organizationId={organizationId}
        orgSlug={orgSlug}
        planId={plan.id}
        employees={employeeChoices}
        labels={{ submit: t("assignCoach"), coach: t("fieldCoach") }}
      />
      <Link
        href={organizationHrmPath(orgSlug, "training")}
        className="text-sm text-primary underline-offset-4 hover:underline"
      >
        {t("trainingLink")}
      </Link>
    </div>
  )
}
