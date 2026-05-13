import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Skeleton } from "#components/ui/skeleton"
import { canActInOrganization } from "#lib/auth/permission.server"
import { requireOrgSession } from "#lib/tenant"

import {
  listActiveEmployeeChoicesForLeave,
  listActiveLeaveTypesForOrg,
} from "../server"

import { LeaveApplyDialog } from "./leave-apply-dialog"
import { LeavePendingInbox } from "./leave-pending-inbox"
import { LeaveRecentTable } from "./leave-recent-table"

/**
 * Leave management surface (Phase 4 — UI binding for the shipped Phase
 * 2B Server Actions). Composition responsibility:
 *
 *  - **Authority** is established by the parent layout (`requireOrgSession`
 *    via the workbench shell) and re-validated here for the apply gate.
 *  - **Tier A** (admin gate + employee/leave-type pickers + translations)
 *    sits in a single blocking `Promise.all` so the page renders the
 *    header + dialog trigger immediately.
 *  - **Tier B** (pending inbox + recent activity) streams behind
 *    Suspense boundaries — neither blocks first paint, and a failure in
 *    one section does not break the other.
 *
 * The applied-on-behalf flow is admin-gated to match the underlying
 * `applyLeaveAction`. Members see a calm read-only "coming soon" panel
 * plus the recent-activity table (no row actions), so navigation
 * remains useful but no privileged affordance is rendered.
 */
type LeavePageProps = {
  orgSlug: string
}

export async function LeavePage({ orgSlug }: LeavePageProps) {
  const orgSession = await requireOrgSession()

  const [t, isAdmin, employees, leaveTypes] = await Promise.all([
    getTranslations("Dashboard.Hrm.leave"),
    canActInOrganization(
      orgSession.userId,
      orgSession.user.role,
      orgSession.organizationId,
      "admin"
    ),
    listActiveEmployeeChoicesForLeave(orgSession.organizationId),
    listActiveLeaveTypesForOrg(orgSession.organizationId),
  ])

  const canApply = isAdmin && employees.length > 0 && leaveTypes.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      {!isAdmin ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("memberRestrictedTitle")}</CardTitle>
            <CardDescription>{t("memberRestrictedBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {isAdmin && employees.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("noEmployeesTitle")}</CardTitle>
            <CardDescription>{t("noEmployeesBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {isAdmin && employees.length > 0 && leaveTypes.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("noLeaveTypesTitle")}</CardTitle>
            <CardDescription>{t("noLeaveTypesBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("inboxTitle")}</CardTitle>
          <CardDescription>{t("inboxDescription")}</CardDescription>
          {canApply ? (
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
            <LeavePendingInbox isAdmin={isAdmin} />
          </Suspense>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("recentTitle")}</CardTitle>
          <CardDescription>{t("recentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<LeaveSectionSkeleton />}>
            <LeaveRecentTable isAdmin={isAdmin} />
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
