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
import { logUnexpectedServerError } from "#lib/logger.server"

import {
  resolveGeolocationSurfaceAccess,
  type GeolocationSurfaceAccess,
} from "../data/geolocation-access.server"
import {
  countRemoteCheckinKpiSummary,
  listGeofencesForOrg,
  listRemoteCheckinDevicesForOrg,
  listRemoteCheckinPoliciesForOrg,
  listVerifiedRemoteCheckinsForOrg,
} from "../data/geolocation.queries.server"
import { listActiveEmployeeChoicesForAttendance } from "../../leave-attendance-management/data/attendance.queries.server"

import { GeolocationDevicesSection } from "./geolocation-devices-section"
import { GeolocationGeofencesSection } from "./geolocation-geofences-section"
import { GeolocationHistorySection } from "./geolocation-history-section"
import { GeolocationKpiSummarySection } from "./geolocation-kpi-section"
import { GeolocationPendingInbox } from "./geolocation-pending-section"
import { GeolocationPoliciesSection } from "./geolocation-policies-section"
import { RemoteCheckinCaptureForm } from "./remote-checkin-capture-form.client"
import { RemoteCheckinReportExportForm } from "./remote-checkin-report-export.client"

type GeolocationPageProps = {
  orgSlug: string
  access?: GeolocationSurfaceAccess
  organizationId?: string
  userId?: string
}

export async function GeolocationPage({
  orgSlug,
  access,
  organizationId: organizationIdProp,
  userId: userIdProp,
}: GeolocationPageProps) {
  const session =
    organizationIdProp && userIdProp
      ? { organizationId: organizationIdProp, userId: userIdProp }
      : await requireOrgSession()

  const { organizationId, userId } = session

  const geoAccess =
    access ??
    (await resolveGeolocationSurfaceAccess({ organizationId, userId }))

  const t = await getTranslations("Dashboard.Hrm.Geolocation")

  if (!geoAccess.canEnter) {
    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  const [
    summaryResult,
    geofencesResult,
    policiesResult,
    devicesResult,
    historyResult,
    employeesResult,
  ] = await Promise.all([
    countRemoteCheckinKpiSummary(organizationId).then(
      (value) => ({ ok: true as const, value }),
      (error) => ({ ok: false as const, error })
    ),
    geoAccess.canRead
      ? listGeofencesForOrg(organizationId, { includeArchived: true }).then(
          (value) => ({ ok: true as const, value }),
          (error) => ({ ok: false as const, error })
        )
      : Promise.resolve({ ok: true as const, value: [] }),
    geoAccess.canRead
      ? listRemoteCheckinPoliciesForOrg(organizationId).then(
          (value) => ({ ok: true as const, value }),
          (error) => ({ ok: false as const, error })
        )
      : Promise.resolve({ ok: true as const, value: [] }),
    geoAccess.canRead
      ? listRemoteCheckinDevicesForOrg(organizationId).then(
          (value) => ({ ok: true as const, value }),
          (error) => ({ ok: false as const, error })
        )
      : Promise.resolve({ ok: true as const, value: [] }),
    geoAccess.canRead
      ? listVerifiedRemoteCheckinsForOrg(organizationId, {
          sinceDays: 7,
          limit: 100,
        }).then(
          (value) => ({ ok: true as const, value }),
          (error) => ({ ok: false as const, error })
        )
      : Promise.resolve({ ok: true as const, value: [] }),
    geoAccess.canManage
      ? listActiveEmployeeChoicesForAttendance(organizationId).then(
          (value) => ({ ok: true as const, value }),
          (error) => ({ ok: false as const, error })
        )
      : Promise.resolve({ ok: true as const, value: [] }),
  ])

  if (!summaryResult.ok) {
    logUnexpectedServerError(
      "geolocation-page: kpi query failed",
      summaryResult.error,
      { organizationId }
    )
  }
  if (!geofencesResult.ok) {
    logUnexpectedServerError(
      "geolocation-page: geofences query failed",
      geofencesResult.error,
      { organizationId }
    )
  }
  if (!policiesResult.ok) {
    logUnexpectedServerError(
      "geolocation-page: policies query failed",
      policiesResult.error,
      { organizationId }
    )
  }
  if (!devicesResult.ok) {
    logUnexpectedServerError(
      "geolocation-page: devices query failed",
      devicesResult.error,
      { organizationId }
    )
  }
  if (!historyResult.ok) {
    logUnexpectedServerError(
      "geolocation-page: history query failed",
      historyResult.error,
      { organizationId }
    )
  }
  if (!employeesResult.ok) {
    logUnexpectedServerError(
      "geolocation-page: employee choices query failed",
      employeesResult.error,
      { organizationId }
    )
  }

  const summary = summaryResult.ok
    ? summaryResult.value
    : {
        verifiedTodayCount: 0,
        pendingExceptionCount: 0,
        outsideGeofenceTodayCount: 0,
        weakAccuracyTodayCount: 0,
        activeGeofenceCount: 0,
        registeredDeviceCount: 0,
      }

  const geofences = geofencesResult.ok ? geofencesResult.value : []
  const activeGeofenceChoices = geofences
    .filter((row) => !row.archivedAt)
    .map((row) => ({ id: row.id, code: row.code, label: row.label }))

  const policies = policiesResult.ok ? policiesResult.value : []
  const devices = devicesResult.ok ? devicesResult.value : []
  const history = historyResult.ok ? historyResult.value : []
  const employees = employeesResult.ok
    ? employeesResult.value.map((row) => ({
        id: row.id,
        label: row.employeeNumber
          ? `${row.legalName} · ${row.employeeNumber}`
          : row.legalName,
      }))
    : []

  const summaryLoadError = summaryResult.ok
    ? undefined
    : { title: t("kpi.loadFailed") }
  const historyLoadError = historyResult.ok
    ? undefined
    : { title: t("history.loadFailed") }
  const geofencesLoadError =
    geoAccess.canRead && !geofencesResult.ok
      ? { title: t("geofences.loadFailed") }
      : undefined
  const policiesLoadError =
    geoAccess.canRead && !policiesResult.ok
      ? { title: t("policies.loadFailed") }
      : undefined
  const devicesLoadError =
    geoAccess.canRead && !devicesResult.ok
      ? { title: t("devices.loadFailed") }
      : undefined

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <GeolocationKpiSummarySection
        summary={summary}
        loadError={summaryLoadError}
      />

      {geoAccess.hasSelfServiceEmployee ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("capture.title")}</CardTitle>
            <CardDescription>{t("capture.description")}</CardDescription>
            <CardAction>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">{t("capture.openDialog")}</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t("capture.dialogTitle")}</DialogTitle>
                    <DialogDescription>
                      {t("capture.dialogDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <RemoteCheckinCaptureForm
                    orgSlug={orgSlug}
                    geofenceChoices={activeGeofenceChoices}
                  />
                </DialogContent>
              </Dialog>
            </CardAction>
          </CardHeader>
        </Card>
      ) : null}

      {geoAccess.canRead ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("pending.title")}</CardTitle>
            <CardDescription>{t("pending.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<GeolocationSectionSkeleton />}>
              <GeolocationPendingInbox
                organizationId={organizationId}
                canDecide={geoAccess.canManage}
              />
            </Suspense>
          </CardContent>
        </Card>
      ) : null}

      {geoAccess.canRead ? (
        <GeolocationHistorySection
          rows={history}
          loadError={historyLoadError}
        />
      ) : null}

      {geoAccess.canManageGeofences || geoAccess.canRead ? (
        <GeolocationGeofencesSection
          orgSlug={orgSlug}
          rows={geofences}
          canManage={geoAccess.canManageGeofences}
          loadError={geofencesLoadError}
        />
      ) : null}

      {geoAccess.canManage || geoAccess.canRead ? (
        <GeolocationPoliciesSection
          orgSlug={orgSlug}
          rows={policies}
          canManage={geoAccess.canManage}
          loadError={policiesLoadError}
        />
      ) : null}

      {geoAccess.canManage || geoAccess.canRead ? (
        <GeolocationDevicesSection
          orgSlug={orgSlug}
          rows={devices}
          canManage={geoAccess.canManage}
          employeeChoices={employees}
          loadError={devicesLoadError}
        />
      ) : null}

      {geoAccess.canAudit ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("report.title")}</CardTitle>
            <CardDescription>{t("report.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <RemoteCheckinReportExportForm orgSlug={orgSlug} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function GeolocationSectionSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}
