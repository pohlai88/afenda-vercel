import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { canActInOrganization } from "#lib/auth/permission.server"
import { requireOrgSession } from "#lib/tenant"

import {
  submitCreateKpiPeriod,
  submitUpsertKpiScore,
} from "../actions/kpi.actions"
import {
  listKpiPeriodsForOrg,
  listKpiScoresForPeriod,
} from "../data/kpi.queries.server"
import { listActiveEmployeeChoicesForLeave } from "../data/leave-request.queries.server"

type HrmKpiPageProps = {
  orgSlug: string
}

export async function HrmKpiPage({ orgSlug }: HrmKpiPageProps) {
  const session = await requireOrgSession()
  const isHrmAdmin = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  const [t, periods, employees] = await Promise.all([
    getTranslations("Dashboard.Hrm.kpi"),
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
                      {e.employeeNumber} — {e.legalName}
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
          {periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("periodsEmpty")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {periods.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap justify-between gap-2 px-3 py-2"
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-muted-foreground">
                    {p.periodStart.toISOString().slice(0, 10)} —{" "}
                    {p.periodEnd.toISOString().slice(0, 10)} · {p.state}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {scores.length > 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">{t("scoresTitle")}</CardTitle>
            <CardDescription>{t("scoresDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {scores.map((s) => (
                <li key={s.id} className="flex flex-col gap-1 px-3 py-2">
                  <span className="font-medium">
                    {s.employeeLegalName} · {s.metricCode}
                  </span>
                  <span className="text-muted-foreground">
                    {t("scoreTarget")}: {s.targetValue ?? "—"} ·{" "}
                    {t("scoreAchieved")}: {s.achievedValue ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
