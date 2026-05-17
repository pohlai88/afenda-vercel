import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { GovernedSurface } from "#features/governed-surface"
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

import { buildGovernedHrmWorkbenchHeader } from "../../../hrm-governed-page-header.server"
import {
  listClaimTypesForOrg,
  listExpenseFundsForOrg,
  resolveClaimSurfaceAccess,
  type ClaimSurfaceAccess,
} from "../server"
import { listActiveEmployeeChoicesForLeave } from "../../../server"

import { ClaimExceptionInbox } from "./claim-exception-inbox"
import { ClaimPendingInbox } from "./claim-pending-inbox"
import { ClaimRecentTable } from "./claim-recent-table"
import { ClaimSubmitDialog } from "./claim-submit-dialog"

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

  const [t, header, employees, claimTypes, expenseFunds] = await Promise.all([
    getTranslations("Dashboard.Hrm.claims"),
    buildGovernedHrmWorkbenchHeader(orgSlug, "Dashboard.Hrm.claims", {
      title: "pageTitle",
      description: "pageDescription",
    }),
    resolvedAccess.canSubmitOnBehalf
      ? listActiveEmployeeChoicesForLeave(orgSession.organizationId)
      : Promise.resolve([]),
    listClaimTypesForOrg(orgSession.organizationId, { activeOnly: true }),
    listExpenseFundsForOrg(orgSession.organizationId, { activeOnly: true }),
  ])

  const canSubmitOwn =
    resolvedAccess.hasSelfServiceEmployee && claimTypes.length > 0
  const canSubmitOnBehalf =
    resolvedAccess.canSubmitOnBehalf &&
    employees.length > 0 &&
    claimTypes.length > 0

  return (
    <GovernedSurface header={header} className="flex flex-col gap-6 p-6">
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

      {resolvedAccess.canApproveExceptions ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("exceptionQueueTitle")}</CardTitle>
            <CardDescription>{t("exceptionQueueDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<ClaimSectionSkeleton />}>
              <ClaimExceptionInbox orgSlug={orgSlug} />
            </Suspense>
          </CardContent>
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
                  <ClaimSubmitDialog
                    mode="own"
                    claimTypes={claimTypes}
                    expenseFunds={expenseFunds}
                  />
                ) : null}
                {canSubmitOnBehalf ? (
                  <ClaimSubmitDialog
                    mode="on_behalf"
                    employees={employees}
                    claimTypes={claimTypes}
                    expenseFunds={expenseFunds}
                  />
                ) : null}
              </div>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ClaimSectionSkeleton />}>
            <ClaimPendingInbox
              orgSlug={orgSlug}
              canManage={resolvedAccess.canManage}
            />
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
    </GovernedSurface>
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
