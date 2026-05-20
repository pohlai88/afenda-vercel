import { getTranslations } from "next-intl/server"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import { listOrgHolidaysForOrganization } from "../data/org-holiday.queries.server"

import { PoliciesOrgHolidayCreateDialog } from "./policies-org-holiday-create-dialog.client"

type PoliciesOrgHolidaysSectionProps = {
  isAdmin: boolean
}

export async function PoliciesOrgHolidaysSection({
  isAdmin,
}: PoliciesOrgHolidaysSectionProps) {
  const [orgSession, t] = await Promise.all([
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.policies"),
  ])
  const rows = await listOrgHolidaysForOrganization(orgSession.organizationId)

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("holidays.title")}</CardTitle>
        <CardDescription>{t("holidays.description")}</CardDescription>
        {isAdmin ? (
          <CardAction>
            <PoliciesOrgHolidayCreateDialog />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("holidays.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pr-4 pb-2 font-medium">
                    {t("holidays.colDate")}
                  </th>
                  <th className="pr-4 pb-2 font-medium">
                    {t("holidays.colName")}
                  </th>
                  <th className="pb-2 font-medium">
                    {t("holidays.colRegion")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-4 tabular-nums">
                      {row.holidayDate}
                    </td>
                    <td className="py-2 pr-4">{row.name}</td>
                    <td className="py-2">{row.regionCode ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
