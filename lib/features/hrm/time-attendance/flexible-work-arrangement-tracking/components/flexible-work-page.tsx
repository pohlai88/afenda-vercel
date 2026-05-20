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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#components2/ui/dialog"
import { Button } from "#components2/ui/button"
import { Skeleton } from "#components2/ui/skeleton"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermission } from "#features/erp-rbac/server"
import { logUnexpectedServerError } from "#lib/logger.server"

import { resolveFwaSurfaceAccess } from "../data/fwa-access.server"
import type { FwaSurfaceAccess } from "../data/fwa-access.server"
import {
  listActiveEmployeeChoicesForFwa,
  listActiveFwaArrangementTypes,
  listFwaRequestsForOrg,
  findFwaEmployeeForUser,
} from "../data/fwa.queries.server"
import { countFwaOrgSummary } from "../data/fwa.queries.server"
import type {
  FwaArrangementTypeChoiceRow,
  OrgFwaRequestRow,
} from "../data/fwa.types.shared"

import { FwaKpiSummarySection } from "./fwa-kpi-section"
import { FwaRequestForm } from "./fwa-request-form"
import {
  FwaActiveArrangementsSection,
  FwaArrangementTypesSection,
  FwaMyArrangementsSection,
} from "./fwa-sections"
import { FwaPendingInbox } from "./fwa-pending-inbox"
import { FwaEligibilityRulesSection } from "./fwa-eligibility-section"
import { FwaOperationalReportSection } from "./fwa-report-section"

type FlexibleWorkPageProps = {
  orgSlug: string
  access?: FwaSurfaceAccess
  organizationId?: string
  userId?: string
}

export async function FlexibleWorkPage({
  orgSlug: _orgSlug,
  access,
  organizationId: organizationIdProp,
  userId: userIdProp,
}: FlexibleWorkPageProps) {
  const orgSession =
    organizationIdProp && userIdProp
      ? { organizationId: organizationIdProp, userId: userIdProp }
      : await requireOrgSession()

  const { organizationId, userId } = orgSession

  const fwaAccess =
    access ??
    (await resolveFwaSurfaceAccess({
      organizationId,
      userId,
    }))

  const t = await getTranslations("Dashboard.Hrm.flexibleWork")

  if (!fwaAccess.canEnter) {
    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  const [
    employeesResult,
    typesResult,
    activeRowsResult,
    summaryResult,
    selfEmployee,
    canApproveAll,
  ] = await Promise.all([
    fwaAccess.canManage
      ? listActiveEmployeeChoicesForFwa(organizationId).then(
          (value) => ({ ok: true as const, value }),
          (error) => ({ ok: false as const, error })
        )
      : Promise.resolve({ ok: true as const, value: [] }),
    listActiveFwaArrangementTypes(organizationId).then(
      (value) => ({ ok: true as const, value }),
      (error) => ({ ok: false as const, error })
    ),
    listFwaRequestsForOrg(organizationId, {
      states: ["submitted", "active", "approved"],
      limit: 100,
    }).then(
      (value) => ({ ok: true as const, value }),
      (error) => ({ ok: false as const, error })
    ),
    countFwaOrgSummary(organizationId).then(
      (value) => ({ ok: true as const, value }),
      (error) => ({ ok: false as const, error })
    ),
    fwaAccess.hasSelfServiceEmployee
      ? findFwaEmployeeForUser(organizationId, userId)
      : Promise.resolve(null),
    canUseErpPermission({
      organizationId,
      userId,
      permission: {
        module: "hrm",
        object: "flexible_work",
        function: "update",
      },
    }),
  ])

  if (!employeesResult.ok) {
    logUnexpectedServerError(
      "flexible-work-page: employees query failed",
      employeesResult.error,
      {
        organizationId,
      }
    )
  }
  if (!typesResult.ok) {
    logUnexpectedServerError(
      "flexible-work-page: types query failed",
      typesResult.error,
      {
        organizationId,
      }
    )
  }
  if (!activeRowsResult.ok) {
    logUnexpectedServerError(
      "flexible-work-page: active rows query failed",
      activeRowsResult.error,
      {
        organizationId,
      }
    )
  }
  if (!summaryResult.ok) {
    logUnexpectedServerError(
      "flexible-work-page: summary query failed",
      summaryResult.error,
      { organizationId }
    )
  }

  const employees = employeesResult.ok ? employeesResult.value : []
  const arrangementTypes: FwaArrangementTypeChoiceRow[] = typesResult.ok
    ? typesResult.value
    : []
  const activeRows: OrgFwaRequestRow[] = activeRowsResult.ok
    ? activeRowsResult.value
    : []

  const typesLoadError = typesResult.ok
    ? undefined
    : { title: t("typesLoadFailed") }
  const activeLoadError = activeRowsResult.ok
    ? undefined
    : { title: t("activeLoadFailed") }
  const summary = summaryResult.ok
    ? summaryResult.value
    : {
        pendingCount: 0,
        activeCount: 0,
        typesCount: 0,
        expiringWithin30DaysCount: 0,
        complianceGapCount: 0,
      }

  const myActiveRows = selfEmployee
    ? activeRows.filter((row) => row.employeeId === selfEmployee.id)
    : []
  const orgActiveRows = fwaAccess.canManage ? activeRows : myActiveRows

  const canRequestOnBehalf =
    fwaAccess.canManage && employees.length > 0 && arrangementTypes.length > 0
  const canRequestSelf = Boolean(selfEmployee) && arrangementTypes.length > 0

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <FwaKpiSummarySection summary={summary} loadError={!summaryResult.ok} />

      {fwaAccess.canManage && employees.length === 0 ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("noEmployeesTitle")}</CardTitle>
            <CardDescription>{t("noEmployeesBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <FwaArrangementTypesSection
        types={arrangementTypes}
        canManage={fwaAccess.canManage}
        loadError={typesLoadError}
      />

      {canRequestSelf ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("myRequestTitle")}</CardTitle>
            <CardDescription>{t("myRequestDescription")}</CardDescription>
            <CardAction>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">{t("requestDialogOpen")}</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t("requestDialogTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("requestDialogDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <FwaRequestForm
                    organizationId={organizationId}
                    employees={[]}
                    arrangementTypes={arrangementTypes}
                    mode="self"
                    defaultEmployeeId={selfEmployee?.id}
                  />
                </DialogContent>
              </Dialog>
            </CardAction>
          </CardHeader>
        </Card>
      ) : null}

      {canRequestOnBehalf ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("onBehalfTitle")}</CardTitle>
            <CardDescription>{t("onBehalfDescription")}</CardDescription>
            <CardAction>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    {t("onBehalfDialogOpen")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t("onBehalfDialogTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("onBehalfDialogDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <FwaRequestForm
                    organizationId={organizationId}
                    employees={employees}
                    arrangementTypes={arrangementTypes}
                    mode="on_behalf"
                  />
                </DialogContent>
              </Dialog>
            </CardAction>
          </CardHeader>
        </Card>
      ) : null}

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("pendingTitle")}</CardTitle>
          <CardDescription>{t("pendingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<FwaSectionSkeleton />}>
            <FwaPendingInbox
              organizationId={organizationId}
              userId={userId}
              canApproveAll={canApproveAll}
            />
          </Suspense>
        </CardContent>
      </Card>

      {selfEmployee ? (
        <FwaMyArrangementsSection
          rows={myActiveRows}
          loadError={activeLoadError}
        />
      ) : null}

      <FwaActiveArrangementsSection
        rows={orgActiveRows}
        loadError={activeLoadError}
        canManageLifecycle={fwaAccess.canManage && canApproveAll}
      />

      {fwaAccess.canManage ? (
        <FwaEligibilityRulesSection
          organizationId={organizationId}
          arrangementTypes={arrangementTypes}
          canManage={fwaAccess.canManage}
        />
      ) : null}

      {fwaAccess.canManage ? (
        <FwaOperationalReportSection organizationId={organizationId} />
      ) : null}
    </div>
  )
}

function FwaSectionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

export { resolveFwaSurfaceAccess }
