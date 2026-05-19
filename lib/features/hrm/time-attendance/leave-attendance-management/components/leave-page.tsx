import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Skeleton } from "#components2/ui/skeleton"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { requireOrgSession } from "#lib/auth"

import { resolveLeaveSurfaceAccess } from "../data/leave-access.server"
import type { LeaveSurfaceAccess } from "../data/leave-access.server"
import {
  listActiveEmployeeChoicesForLeave,
  listActiveLeaveTypesForOrg,
} from "../data/leave-request.queries.server"

import { LeaveAbsenceCalendar } from "./leave-absence-calendar"
import { LeaveApplyDialog } from "./leave-apply-dialog"
import { LeaveMyPanel } from "./leave-my-panel"
import { LeavePendingInbox } from "./leave-pending-inbox"
import { LeaveRecentTable } from "./leave-recent-table"
import { LeaveExportReportButton } from "./leave-export-report-button.client"

/**
 * Leave management surface. The page stays server-first and splits the
 * domain into self-service, approval, and visibility sections while all
 * authority remains inside Server Components and Server Actions.
 */
type LeavePageProps = {
  orgSlug: string
  access?: LeaveSurfaceAccess
}

export async function LeavePage({ orgSlug, access }: LeavePageProps) {
  const orgSession = await requireOrgSession()
  const leaveAccess =
    access ??
    (await resolveLeaveSurfaceAccess({
      organizationId: orgSession.organizationId,
      userId: orgSession.userId,
    }))

  if (!leaveAccess.canEnter) {
    return (
      <ErpAccessDenied
        title="Leave"
        description="This HRM surface requires Leave access or a linked employee record."
      />
    )
  }

  const [t, employees, leaveTypes] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    leaveAccess.canManage
      ? listActiveEmployeeChoicesForLeave(orgSession.organizationId)
      : Promise.resolve([]),
    listActiveLeaveTypesForOrg(orgSession.organizationId),
  ])

  const canApplyOnBehalf =
    leaveAccess.canManage && employees.length > 0 && leaveTypes.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <ModulePageHeader
          eyebrow={t("eyebrow")}
          title={t("pageTitle")}
          description={t("pageDescription")}
        />
        {leaveAccess.canManage ? <LeaveExportReportButton /> : null}
      </div>

      {leaveAccess.canManage && employees.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("noEmployeesTitle")}</CardTitle>
            <CardDescription>{t("noEmployeesBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {leaveAccess.canManage &&
      employees.length > 0 &&
      leaveTypes.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("noLeaveTypesTitle")}</CardTitle>
            <CardDescription>{t("noLeaveTypesBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("myLeaveTitle")}</CardTitle>
          <CardDescription>{t("myLeaveDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LeaveSectionSkeleton />}>
            <LeaveMyPanel leaveTypes={leaveTypes} />
          </Suspense>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("inboxTitle")}</CardTitle>
          <CardDescription>{t("inboxDescription")}</CardDescription>
          {canApplyOnBehalf ? (
            <CardAction>
              <LeaveApplyDialog
                orgSlug={orgSlug}
                employees={employees}
                leaveTypes={leaveTypes}
              />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LeaveSectionSkeleton />}>
            <LeavePendingInbox canApproveAll={leaveAccess.canManage} />
          </Suspense>
        </CardContent>
      </Card>

      {leaveAccess.canManage ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("recentTitle")}</CardTitle>
            <CardDescription>{t("recentDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LeaveSectionSkeleton />}>
              <LeaveRecentTable isAdmin={leaveAccess.canManage} />
            </Suspense>
          </CardContent>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("absenceTitle")}</CardTitle>
          <CardDescription>{t("absenceDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LeaveSectionSkeleton />}>
            <LeaveAbsenceCalendar />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function LeaveSectionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}
