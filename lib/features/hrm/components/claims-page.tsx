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
import { requireOrgSession } from "#lib/tenant"

import {
  listActiveEmployeeChoicesForLeave,
  listClaimTypesForOrg,
  resolveClaimSurfaceAccess,
  type ClaimSurfaceAccess,
} from "../server"

import { ClaimPendingInbox } from "./claim-pending-inbox"
import { ClaimRecentTable } from "./claim-recent-table"
import { ClaimSubmitDialog } from "./claim-submit-dialog"

/**
 * Claims management surface. Composition mirrors the leave page:
 *
 *  - **Authority** is established by the parent layout (`requireOrgSession`
 *    via the workbench shell) and re-validated here for the submit gate.
 *  - **Tier A** (claim access + employee/claim-type pickers + translations)
 *    sits in a single blocking `Promise.all` so the page renders the
 *    header + dialog trigger immediately.
 *  - **Tier B** (pending inbox + recent activity) streams behind
 *    Suspense boundaries — neither blocks first paint, and a failure in
 *    one section does not break the other.
 *
 * Self-service resolves the linked employee from the authenticated user.
 * Submit-on-behalf and approval controls stay behind claim permissions.
 */
type ClaimsPageProps = {
  orgSlug: string
  access?: ClaimSurfaceAccess
}

export async function ClaimsPage({ orgSlug, access }: ClaimsPageProps) {
  const orgSession = await requireOrgSession()
  const resolvedAccess =
    access ??
    (await resolveClaimSurfaceAccess({
      organizationId: orgSession.organizationId,
      userId: orgSession.userId,
    }))

  const [t, employees, claimTypes] = await Promise.all([
    getTranslations("Dashboard.Hrm.claims"),
    resolvedAccess.canSubmitOnBehalf
      ? listActiveEmployeeChoicesForLeave(orgSession.organizationId)
      : Promise.resolve([]),
    listClaimTypesForOrg(orgSession.organizationId, { activeOnly: true }),
  ])

  const canSubmitOwn =
    resolvedAccess.hasSelfServiceEmployee && claimTypes.length > 0
  const canSubmitOnBehalf =
    resolvedAccess.canSubmitOnBehalf &&
    employees.length > 0 &&
    claimTypes.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      {!resolvedAccess.hasSelfServiceEmployee &&
      !resolvedAccess.canReadOrgClaims ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("memberRestrictedTitle")}</CardTitle>
            <CardDescription>{t("memberRestrictedBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {resolvedAccess.canSubmitOnBehalf && employees.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("noEmployeesTitle")}</CardTitle>
            <CardDescription>{t("noEmployeesBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {(resolvedAccess.canSubmitOnBehalf ||
        resolvedAccess.hasSelfServiceEmployee) &&
      claimTypes.length === 0 ? (
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
          {canSubmitOwn || canSubmitOnBehalf ? (
            <CardAction>
              <div className="flex flex-wrap gap-2">
                {canSubmitOwn ? (
                  <ClaimSubmitDialog mode="own" claimTypes={claimTypes} />
                ) : null}
                {canSubmitOnBehalf ? (
                  <ClaimSubmitDialog
                    mode="on_behalf"
                    employees={employees}
                    claimTypes={claimTypes}
                  />
                ) : null}
              </div>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ClaimSectionSkeleton />}>
            <ClaimPendingInbox canManage={resolvedAccess.canManage} />
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
            <ClaimRecentTable orgSlug={orgSlug} access={resolvedAccess} />
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
