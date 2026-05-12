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
  listClaimTypesForOrg,
} from "../server"

import { ClaimPendingInbox } from "./claim-pending-inbox"
import { ClaimRecentTable } from "./claim-recent-table"
import { ClaimSubmitDialog } from "./claim-submit-dialog"

/**
 * Claims management surface (Phase 4 — UI binding for the new claims
 * Server Actions). Composition mirrors the leave page:
 *
 *  - **Authority** is established by the parent layout (`requireOrgSession`
 *    via the workbench shell) and re-validated here for the submit gate.
 *  - **Tier A** (admin gate + employee/claim-type pickers + translations)
 *    sits in a single blocking `Promise.all` so the page renders the
 *    header + dialog trigger immediately.
 *  - **Tier B** (pending inbox + recent activity) streams behind
 *    Suspense boundaries — neither blocks first paint, and a failure in
 *    one section does not break the other.
 *
 * The submit-on-behalf flow is admin-gated to match the underlying
 * `submitClaimAction`. Members see a calm read-only "coming soon" panel
 * plus the recent-activity table (no row actions), so navigation
 * remains useful but no privileged affordance is rendered.
 */
export async function ClaimsPage() {
  const orgSession = await requireOrgSession()

  const [t, isAdmin, employees, claimTypes] = await Promise.all([
    getTranslations("Dashboard.Hrm.claims"),
    canActInOrganization(
      orgSession.userId,
      orgSession.user.role,
      orgSession.organizationId,
      "admin"
    ),
    listActiveEmployeeChoicesForLeave(orgSession.organizationId),
    listClaimTypesForOrg(orgSession.organizationId, { activeOnly: true }),
  ])

  const canSubmit = isAdmin && employees.length > 0 && claimTypes.length > 0

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

      {isAdmin && employees.length > 0 && claimTypes.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("noClaimTypesTitle")}</CardTitle>
            <CardDescription>{t("noClaimTypesBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("inboxTitle")}</CardTitle>
          <CardDescription>{t("inboxDescription")}</CardDescription>
          {canSubmit ? (
            <CardAction>
              <ClaimSubmitDialog
                employees={employees}
                claimTypes={claimTypes}
              />
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ClaimSectionSkeleton />}>
            <ClaimPendingInbox isAdmin={isAdmin} />
          </Suspense>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("recentTitle")}</CardTitle>
          <CardDescription>{t("recentDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ClaimSectionSkeleton />}>
            <ClaimRecentTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

function ClaimSectionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}
