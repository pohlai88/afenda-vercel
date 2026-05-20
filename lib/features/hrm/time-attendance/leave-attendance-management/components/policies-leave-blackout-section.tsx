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

import { listActiveLeaveBlackoutsForOrg } from "../data/leave-blackout.queries.server"
import { listAllLeaveTypesForOrg } from "../data/leave-policy.queries.server"

import { PoliciesLeaveBlackoutCreateDialog } from "./policies-leave-blackout-create-dialog.client"
import { PoliciesLeaveBlackoutArchiveButton } from "./policies-leave-blackout-archive-button.client"

type PoliciesLeaveBlackoutSectionProps = {
  isAdmin: boolean
}

export async function PoliciesLeaveBlackoutSection({
  isAdmin,
}: PoliciesLeaveBlackoutSectionProps) {
  const [orgSession, t] = await Promise.all([
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.policies"),
  ])
  const [rows, leaveTypes] = await Promise.all([
    listActiveLeaveBlackoutsForOrg(orgSession.organizationId),
    listAllLeaveTypesForOrg(orgSession.organizationId),
  ])

  const activeLeaveTypes = leaveTypes.filter((lt) => lt.archivedAt === null)
  const leaveTypeById = new Map(activeLeaveTypes.map((lt) => [lt.id, lt.code]))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("blackout.title")}</CardTitle>
        <CardDescription>{t("blackout.description")}</CardDescription>
        {isAdmin ? (
          <CardAction>
            <PoliciesLeaveBlackoutCreateDialog
              leaveTypes={activeLeaveTypes.map((lt) => ({
                id: lt.id,
                code: lt.code,
              }))}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("blackout.empty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pr-4 pb-2 font-medium">
                    {t("blackout.colName")}
                  </th>
                  <th className="pr-4 pb-2 font-medium">
                    {t("blackout.colPeriod")}
                  </th>
                  <th className="pr-4 pb-2 font-medium">
                    {t("blackout.colLeaveType")}
                  </th>
                  {isAdmin ? (
                    <th className="pb-2 font-medium">
                      {t("blackout.colActions")}
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-4">{row.name}</td>
                    <td className="py-2 pr-4 tabular-nums">
                      {row.startDate} → {row.endDate}
                    </td>
                    <td className="py-2 pr-4">
                      {row.leaveTypeId
                        ? (leaveTypeById.get(row.leaveTypeId) ??
                          row.leaveTypeId)
                        : t("blackout.allLeaveTypes")}
                    </td>
                    {isAdmin ? (
                      <td className="py-2">
                        <PoliciesLeaveBlackoutArchiveButton
                          blackoutId={row.id}
                        />
                      </td>
                    ) : null}
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
