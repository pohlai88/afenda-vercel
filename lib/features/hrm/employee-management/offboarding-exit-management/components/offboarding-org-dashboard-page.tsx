import { getFormatter, getTranslations } from "next-intl/server"

import type { Route } from "next"

import { Link } from "#i18n/navigation"
import { Badge } from "#components2/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"

import { organizationHrmEmployeePath } from "../../../constants"
import { listOffboardingInstancesForOrgDashboard } from "../data/offboarding-org-dashboard.queries.server"
import type { OffboardingSurfaceCapabilities } from "../data/offboarding-capabilities.shared"
import { OffboardingApprovalActions } from "./offboarding-approval-actions"

type OffboardingOrgDashboardPageProps = {
  orgSlug: string
  capabilities: OffboardingSurfaceCapabilities
}

export async function OffboardingOrgDashboardPage({
  orgSlug,
  capabilities,
}: OffboardingOrgDashboardPageProps) {
  const { organizationId } = await requireOrgSession()
  const [t, format, rows] = await Promise.all([
    getTranslations("Dashboard.Hrm.offboarding"),
    getFormatter(),
    listOffboardingInstancesForOrgDashboard(organizationId),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{t("dashboardTitle")}</CardTitle>
        <CardDescription>{t("dashboardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("dashboardEmpty")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                  <th className="py-2 pr-3 font-medium">{t("colEmployee")}</th>
                  <th className="py-2 pr-3 font-medium">{t("colExitType")}</th>
                  <th className="py-2 pr-3 font-medium">{t("colStatus")}</th>
                  <th className="py-2 pr-3 font-medium">{t("colLastWorking")}</th>
                  <th className="py-2 pr-3 font-medium">{t("colTasks")}</th>
                  <th className="py-2 font-medium">{t("colSettlement")}</th>
                  <th className="py-2 font-medium">{t("colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-2 pr-3">
                      <Link
                        href={
                          organizationHrmEmployeePath(
                            orgSlug,
                            row.employeeId
                          ) as Route
                        }
                        className="font-medium hover:underline"
                      >
                        {row.legalName}
                      </Link>
                      {row.employeeNumber ? (
                        <p className="text-xs text-muted-foreground">
                          {row.employeeNumber}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-2 pr-3">{row.exitType ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline">{row.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {row.lastWorkingDate
                        ? format.dateTime(
                            new Date(`${row.lastWorkingDate}T00:00:00Z`),
                            { dateStyle: "medium" }
                          )
                        : "—"}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      {t("taskCounts", {
                        pending: row.pendingTaskCount,
                        overdue: row.overdueTaskCount,
                      })}
                    </td>
                    <td className="py-2 text-muted-foreground">
                      {row.settlementReadinessStatus}
                    </td>
                    <td className="py-2 align-top">
                      {row.status === "pending_approval" ? (
                        <OffboardingApprovalActions
                          orgSlug={orgSlug}
                          employeeId={row.employeeId}
                          instanceId={row.id}
                          capabilities={capabilities}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
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
