import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Input } from "#components2/ui/input"
import { Textarea } from "#components2/ui/textarea"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import { submitRequestSalaryAdvance } from "../actions/salary-advance.actions"
import { listActiveEmployeeChoicesForLeave } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import { listSalaryAdvancesForOrg } from "../data/salary-advance.queries.server"

import { HrmAdvancesListSection } from "./hrm-advances-list-section"

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

  const [t, advances, employees] = await Promise.all([
    getTranslations("Dashboard.Hrm.advances"),
    listSalaryAdvancesForOrg(session.organizationId),
    listActiveEmployeeChoicesForLeave(session.organizationId),
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
          <HrmAdvancesListSection
            orgSlug={orgSlug}
            isAdmin={isAdmin}
            advances={advances}
          />
        </CardContent>
      </Card>
    </div>
  )
}
