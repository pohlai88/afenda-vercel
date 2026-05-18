import type { ReactElement } from "react"
import { getFormatter, getTranslations } from "next-intl/server"
import type { Route } from "next"

import { Badge } from "#components2/ui/badge"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Input } from "#components2/ui/input"
import { Progress } from "#components2/ui/progress"
import { Textarea } from "#components2/ui/textarea"
import { Link } from "#i18n/navigation"

import {
  submitAddKpiGoalMilestoneAction,
  submitCloseKpiGoalAction,
  submitCreateKpiGoalAction,
  submitDeleteKpiGoalAction,
  submitDeleteKpiGoalCommentAction,
  submitPostKpiGoalCommentAction,
} from "../actions/kpi-goal.actions"
import { KpiGoalMilestonesListSection } from "./kpi-goal-milestones-list-section"
import { organizationHrmPath } from "../../../constants"
import {
  listKpiGoalAggregateForOrganization,
  listKpiGoalCommentsForGoals,
  listKpiGoalMilestonesForGoals,
} from "../data/kpi-goal.queries.server"
import { listActiveEmployeeChoicesForLeave } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import type { ContractMutationFormState } from "../../../types"
import type { KpiGoalStatus } from "../schemas/kpi-goal.schema"

function groupByKey<T>(
  items: readonly T[],
  keyFn: (item: T) => string
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = keyFn(item)
    const arr = map.get(k)
    if (arr) arr.push(item)
    else map.set(k, [item])
  }
  return map
}

function asVoidKpiGoalAction(
  fn: (formData: FormData) => Promise<ContractMutationFormState>
): (formData: FormData) => Promise<void> {
  return async (formData) => {
    await fn(formData)
  }
}

export type KpiGoalListGoalStatusFilter = "all" | KpiGoalStatus

type KpiGoalListProps = {
  orgSlug: string
  organizationId: string
  viewerUserId: string
  isHrmAdmin: boolean
  goalStatus: KpiGoalListGoalStatusFilter
}

function goalsHref(
  orgSlug: string,
  status: KpiGoalListGoalStatusFilter
): Route {
  const base = organizationHrmPath(orgSlug, "kpi")
  if (status === "all") {
    return `${base}?tab=goals` as Route
  }
  return `${base}?tab=goals&goalStatus=${status}` as Route
}

export async function KpiGoalList({
  orgSlug,
  organizationId,
  viewerUserId,
  isHrmAdmin,
  goalStatus,
}: KpiGoalListProps) {
  const [t, format, aggregate, employees] = await Promise.all([
    getTranslations("Dashboard.Hrm.kpi"),
    getFormatter(),
    listKpiGoalAggregateForOrganization({
      organizationId,
      status: goalStatus === "all" ? undefined : goalStatus,
    }),
    listActiveEmployeeChoicesForLeave(organizationId),
  ])

  const { counts, goals } = aggregate

  const goalIds = goals.map((g) => g.id)
  const [allMilestones, allComments] = await Promise.all([
    listKpiGoalMilestonesForGoals({ organizationId, goalIds }),
    listKpiGoalCommentsForGoals({ organizationId, goalIds }),
  ])

  const milestonesByGoal = groupByKey(allMilestones, (m) => m.goalId)
  const commentsByGoal = groupByKey(allComments, (c) => c.goalId)

  const goalCards: ReactElement[] = []
  for (const goal of goals) {
    const milestones = milestonesByGoal.get(goal.id) ?? []
    const comments = commentsByGoal.get(goal.id) ?? []

    goalCards.push(
      <li key={goal.id}>
        <Card size="sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">{goal.title}</CardTitle>
                <CardDescription className="mt-1">
                  {goal.description ?? ""}
                </CardDescription>
              </div>
              <Badge variant="outline">{goal.status}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <span>
                {t("goalOwner")}:{" "}
                <span className="text-foreground">{goal.ownerLegalName}</span>
              </span>
              <span>
                {t("goalDue")}:{" "}
                <span className="text-foreground">
                  {format.dateTime(goal.dueDate, { dateStyle: "medium" })}
                </span>
              </span>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {t("goalPercent")}
              </p>
              <Progress value={goal.percentComplete} />
              <p className="text-xs text-muted-foreground">
                {goal.percentComplete}%
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                {t("goalMilestonesTitle")}
              </p>
              <KpiGoalMilestonesListSection
                orgSlug={orgSlug}
                milestones={milestones.map((m) => ({
                  id: m.id,
                  title: m.title,
                }))}
                isHrmAdmin={isHrmAdmin}
              />
              {isHrmAdmin ? (
                <form
                  action={asVoidKpiGoalAction(submitAddKpiGoalMilestoneAction)}
                  className="mt-3 flex flex-wrap gap-2"
                >
                  <input type="hidden" name="orgSlug" value={orgSlug} />
                  <input type="hidden" name="goalId" value={goal.id} />
                  <Input
                    name="title"
                    placeholder={t("goalMilestoneTitle")}
                    className="max-w-xs"
                    required
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    {t("goalMilestoneAdd")}
                  </Button>
                </form>
              ) : null}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">
                {t("goalCommentsTitle")}
              </p>
              <ul className="mb-3 space-y-2 text-sm">
                {comments.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-md border border-border/60 bg-muted/30 px-3 py-2"
                  >
                    <p>{c.commentText}</p>
                    {c.authorUserId === viewerUserId ? (
                      <form
                        action={asVoidKpiGoalAction(
                          submitDeleteKpiGoalCommentAction
                        )}
                        className="mt-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input type="hidden" name="commentId" value={c.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          {t("goalCommentDelete")}
                        </Button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
              <form
                action={asVoidKpiGoalAction(submitPostKpiGoalCommentAction)}
                className="flex flex-col gap-2 sm:flex-row"
              >
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <input type="hidden" name="goalId" value={goal.id} />
                <Input
                  name="text"
                  placeholder={t("goalCommentPlaceholder")}
                  className="flex-1"
                  required
                />
                <Button type="submit" size="sm" variant="secondary">
                  {t("goalCommentSubmit")}
                </Button>
              </form>
            </div>
          </CardContent>
          {isHrmAdmin ? (
            <CardFooter className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <form action={asVoidKpiGoalAction(submitCloseKpiGoalAction)}>
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <input type="hidden" name="goalId" value={goal.id} />
                <Button type="submit" variant="outline" size="sm">
                  {t("goalClose")}
                </Button>
              </form>
              <form action={asVoidKpiGoalAction(submitDeleteKpiGoalAction)}>
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <input type="hidden" name="goalId" value={goal.id} />
                <Button type="submit" variant="destructive" size="sm">
                  {t("goalDelete")}
                </Button>
              </form>
            </CardFooter>
          ) : null}
        </Card>
      </li>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={goalStatus === "all" ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link href={goalsHref(orgSlug, "all")}>{t("goalsFilterAll")}</Link>
        </Button>
        <Button
          variant={goalStatus === "in_progress" ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link href={goalsHref(orgSlug, "in_progress")}>
            {t("goalsFilterInProgress")}
          </Link>
        </Button>
        <Button
          variant={goalStatus === "completed" ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link href={goalsHref(orgSlug, "completed")}>
            {t("goalsFilterCompleted")}
          </Link>
        </Button>
        <Button
          variant={goalStatus === "closed" ? "secondary" : "outline"}
          size="sm"
          asChild
        >
          <Link href={goalsHref(orgSlug, "closed")}>
            {t("goalsFilterClosed")}
          </Link>
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {t("goalsCounts", {
          inProgress: counts.in_progress,
          completed: counts.completed,
          closed: counts.closed,
        })}
      </p>

      {isHrmAdmin ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("goalCreateTitle")}</CardTitle>
            <CardDescription>{t("goalsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={asVoidKpiGoalAction(submitCreateKpiGoalAction)}
              className="grid max-w-xl gap-3"
            >
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="kpi-goal-emp"
                >
                  {t("goalFieldEmployee")}
                </label>
                <select
                  id="kpi-goal-emp"
                  name="ownerEmployeeId"
                  required
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("selectEmployee")}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.employeeNumber} ÔÇö {e.legalName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="kpi-goal-title"
                >
                  {t("goalFieldTitle")}
                </label>
                <Input
                  id="kpi-goal-title"
                  name="title"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="kpi-goal-desc"
                >
                  {t("goalFieldDescription")}
                </label>
                <Textarea
                  id="kpi-goal-desc"
                  name="description"
                  className="mt-1"
                />
              </div>
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="kpi-goal-due"
                >
                  {t("goalFieldDue")}
                </label>
                <Input
                  id="kpi-goal-due"
                  name="dueDate"
                  type="date"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="kpi-goal-align"
                >
                  {t("goalFieldAligns")}
                </label>
                <Input
                  id="kpi-goal-align"
                  name="alignsWithGoalId"
                  className="mt-1"
                />
              </div>
              <Button type="submit" variant="secondary" className="max-w-xs">
                {t("goalCreateSubmit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("goalsEmpty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">{goalCards}</ul>
      )}
    </div>
  )
}
