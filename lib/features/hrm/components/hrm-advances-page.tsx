import { getFormatter, getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Input } from "#components/ui/input"
import { Textarea } from "#components/ui/textarea"
import { requireOrgSession } from "#lib/tenant"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import {
  submitDecideSalaryAdvance,
  submitRequestSalaryAdvance,
} from "../actions/salary-advance.actions"
import { listActiveEmployeeChoicesForLeave } from "../data/leave-request.queries.server"
import { listSalaryAdvancesForOrg } from "../data/salary-advance.queries.server"

type HrmAdvancesPageProps = {
  orgSlug: string
}

export async function HrmAdvancesPage({ orgSlug }: HrmAdvancesPageProps) {
  const session = await requireOrgSession()
  const isAdmin = await canUseErpPermissionForCurrentOrg({
    module: "hrm",
    object: "salary_advance",
    function: "update",
  })

  const [t, advances, employees, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.advances"),
    listSalaryAdvancesForOrg(session.organizationId),
    listActiveEmployeeChoicesForLeave(session.organizationId),
    getFormatter(),
  ])

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("requestTitle")}</CardTitle>
          <CardDescription>{t("requestDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={submitRequestSalaryAdvance}
            className="grid max-w-xl gap-3"
          >
            <input type="hidden" name="orgSlug" value={orgSlug} />
            <div>
              <label
                className="text-sm text-muted-foreground"
                htmlFor="adv-emp"
              >
                {t("fieldEmployee")}
              </label>
              <select
                id="adv-emp"
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
                htmlFor="adv-amt"
              >
                {t("fieldAmount")}
              </label>
              <Input
                id="adv-amt"
                name="amount"
                required
                inputMode="decimal"
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <label
                className="text-sm text-muted-foreground"
                htmlFor="adv-reason"
              >
                {t("fieldReason")}
              </label>
              <Textarea
                id="adv-reason"
                name="reason"
                rows={3}
                className="mt-1"
              />
            </div>
            <Button type="submit" variant="secondary" className="max-w-xs">
              {t("requestSubmit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("tableTitle")}</CardTitle>
          <CardDescription>{t("tableDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {advances.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("tableEmpty")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {advances.map((a) => (
                <li key={a.id} className="flex flex-col gap-3 px-3 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium">{a.employeeLegalName}</span>
                    <span className="text-muted-foreground">
                      {a.amount} {a.currency} · {a.state}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format.dateTime(a.requestedAt, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  {a.reason ? (
                    <p className="text-xs whitespace-pre-wrap text-muted-foreground">
                      {a.reason}
                    </p>
                  ) : null}
                  {isAdmin && a.state === "pending" ? (
                    <div className="flex flex-col gap-2 border-t border-border pt-2 sm:flex-row sm:items-start">
                      <form
                        action={submitDecideSalaryAdvance}
                        className="flex flex-1 flex-col gap-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input type="hidden" name="advanceId" value={a.id} />
                        <input type="hidden" name="decision" value="approve" />
                        <Textarea
                          name="decisionNote"
                          rows={2}
                          placeholder={t("decisionNotePlaceholder")}
                          className="text-xs"
                        />
                        <Button
                          type="submit"
                          variant="secondary"
                          size="sm"
                          className="w-fit"
                        >
                          {t("approve")}
                        </Button>
                      </form>
                      <form
                        action={submitDecideSalaryAdvance}
                        className="flex flex-1 flex-col gap-2"
                      >
                        <input type="hidden" name="orgSlug" value={orgSlug} />
                        <input type="hidden" name="advanceId" value={a.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <Textarea
                          name="decisionNote"
                          rows={2}
                          placeholder={t("decisionNotePlaceholder")}
                          className="text-xs"
                        />
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          className="w-fit"
                        >
                          {t("reject")}
                        </Button>
                      </form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
