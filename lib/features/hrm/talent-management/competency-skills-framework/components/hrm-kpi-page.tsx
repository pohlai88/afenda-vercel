import { getFormatter, getTranslations } from "next-intl/server"
import type { Route } from "next"

import { ModulePageHeader } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { requireOrgSession } from "#lib/auth"
import { Link } from "#i18n/navigation"

import {
  submitCreateKpiPeriod,
  submitUpsertKpiScore,
} from "../actions/kpi.actions"
import { organizationHrmPath } from "../../../constants"
import {
  listKpiPeriodsForOrg,
  listKpiScoresForPeriod,
} from "../data/kpi.queries.server"
import { listActiveEmployeeChoicesForLeave } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"

import { KpiGoalList, type KpiGoalListGoalStatusFilter } from "./kpi-goal-list"
import {
  KpiPeriodsListSection,
  KpiScoresListSection,
} from "./kpi-metrics-list-sections"

type HrmKpiPageProps = {
  orgSlug: string
  activeTab?: "metrics" | "goals"
  /** Raw `goalStatus` search param (only used when `activeTab` is `goals`). */
  goalStatusFilter?: string
  /** Whether the current user has HRM KPI update permission (passed from route page). */
  isHrmAdmin: boolean
}

function parseGoalStatus(raw: string | undefined): KpiGoalListGoalStatusFilter {
  if (raw === "in_progress" || raw === "completed" || raw === "closed") {
    return raw
  }
  return "all"
}

export async function HrmKpiPage({
  orgSlug,
  activeTab = "metrics",
  goalStatusFilter,
  isHrmAdmin,
}: HrmKpiPageProps) {
  const session = await requireOrgSession()
  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.kpi"),
    getFormatter(),
  ])
  const basePath = organizationHrmPath(orgSlug, "kpi")

  const tabNav = (
    <div className="inline-flex w-fit gap-1 rounded-full bg-muted p-1">
      <Button
        variant={activeTab === "metrics" ? "secondary" : "ghost"}
        size="sm"
        asChild
      >
        <Link href={basePath}>{t("surfaceTabMetrics")}</Link>
      </Button>
      <Button
        variant={activeTab === "goals" ? "secondary" : "ghost"}
        size="sm"
        asChild
      >
        <Link href={`${basePath}?tab=goals` as Route}>
          {t("surfaceTabGoals")}
        </Link>
      </Button>
    </div>
  )

  if (activeTab === "goals") {
    return (
      <div className="flex flex-col gap-6 p-6">
        <ModulePageHeader
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
        {tabNav}
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {t("goalsTitle")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("goalsDescription")}
          </p>
        </div>
        <KpiGoalList
          orgSlug={orgSlug}
          organizationId={session.organizationId}
          viewerUserId={session.userId}
          isHrmAdmin={isHrmAdmin}
          goalStatus={parseGoalStatus(goalStatusFilter)}
        />
      </div>
    )
  }

  const [periods, employees] = await Promise.all([
    listKpiPeriodsForOrg(session.organizationId),
    listActiveEmployeeChoicesForLeave(session.organizationId),
  ])

  const firstPeriodId = periods[0]?.id
  const scores =
    firstPeriodId !== undefined
      ? await listKpiScoresForPeriod(session.organizationId, firstPeriodId)
      : []

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {tabNav}

      {isHrmAdmin ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("createPeriodTitle")}
            </CardTitle>
            <CardDescription>{t("createPeriodDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={submitCreateKpiPeriod}
              className="grid max-w-xl gap-3"
            >
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="kpi-name"
                >
                  {t("fieldName")}
                </label>
                <Input id="kpi-name" name="name" required className="mt-1" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm text-muted-foreground"
                    htmlFor="kpi-start"
                  >
                    {t("fieldPeriodStart")}
                  </label>
                  <Input
                    id="kpi-start"
                    name="periodStart"
                    type="date"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label
                    className="text-sm text-muted-foreground"
                    htmlFor="kpi-end"
                  >
                    {t("fieldPeriodEnd")}
                  </label>
                  <Input
                    id="kpi-end"
                    name="periodEnd"
                    type="date"
                    required
                    className="mt-1"
                  />
                </div>
              </div>
              <Button type="submit" variant="secondary" className="max-w-xs">
                {t("createPeriodSubmit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {isHrmAdmin && firstPeriodId ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("upsertScoreTitle")}</CardTitle>
            <CardDescription>{t("upsertScoreDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={submitUpsertKpiScore} className="grid max-w-xl gap-3">
              <input type="hidden" name="orgSlug" value={orgSlug} />
              <input type="hidden" name="periodId" value={firstPeriodId} />
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="kpi-emp"
                >
                  {t("fieldEmployee")}
                </label>
                <select
                  id="kpi-emp"
                  name="employeeId"
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
                  htmlFor="kpi-metric"
                >
                  {t("fieldMetricCode")}
                </label>
                <Input
                  id="kpi-metric"
                  name="metricCode"
                  required
                  className="mt-1"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    className="text-sm text-muted-foreground"
                    htmlFor="kpi-target"
                  >
                    {t("fieldTarget")}
                  </label>
                  <Input id="kpi-target" name="targetValue" className="mt-1" />
                </div>
                <div>
                  <label
                    className="text-sm text-muted-foreground"
                    htmlFor="kpi-achieved"
                  >
                    {t("fieldAchieved")}
                  </label>
                  <Input
                    id="kpi-achieved"
                    name="achievedValue"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <label
                  className="text-sm text-muted-foreground"
                  htmlFor="kpi-notes"
                >
                  {t("fieldNotes")}
                </label>
                <Input id="kpi-notes" name="notes" className="mt-1" />
              </div>
              <Button type="submit" variant="secondary" className="max-w-xs">
                {t("upsertScoreSubmit")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("periodsTitle")}</CardTitle>
          <CardDescription>{t("periodsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <KpiPeriodsListSection
            periods={periods}
            formatRange={(period) =>
              `${format.dateTime(period.periodStart, { dateStyle: "medium" })} — ${format.dateTime(period.periodEnd, { dateStyle: "medium" })}`
            }
          />
        </CardContent>
      </Card>

      {scores.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("scoresTitle")}</CardTitle>
            <CardDescription>{t("scoresDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <KpiScoresListSection
              scores={scores}
              formatTargets={(score) =>
                `${t("scoreTarget")}: ${score.targetValue ?? "—"} · ${t("scoreAchieved")}: ${score.achievedValue ?? "—"}`
              }
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
