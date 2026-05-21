import { getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { ModulePageHeader } from "#features/governed-surface"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { requireOrgSession } from "#lib/auth"
import { logUnexpectedServerError } from "#lib/logger.server"

import { resolveTimeClockSurfaceAccess } from "../data/tci-access.server"
import type { TimeClockSurfaceAccess } from "../data/tci-access.server"
import {
  countTimeClockKpiSummary,
  listTimeClockDevicesForOrg,
  listTimeClockExceptionsForOrg,
  listTimeClockMappingsForOrg,
} from "../data/tci.queries.server"
import { listActiveEmployeeChoicesForAttendance } from "../../leave-attendance-management/data/attendance.queries.server"

import { TimeClockDevicesSection } from "./tci-devices-section"
import { TimeClockExceptionsSection } from "./tci-exceptions-section"
import { TimeClockKpiSection } from "./tci-kpi-section"
import { TimeClockMappingsSection } from "./tci-mappings-section"
import { TimeClockReportExportForm } from "./tci-report-export.client"

type TimeClockPageProps = {
  orgSlug: string
  access?: TimeClockSurfaceAccess
  organizationId?: string
  userId?: string
}

export async function TimeClockPage({
  orgSlug,
  access,
  organizationId: organizationIdProp,
  userId: userIdProp,
}: TimeClockPageProps) {
  const session =
    organizationIdProp && userIdProp
      ? { organizationId: organizationIdProp, userId: userIdProp }
      : await requireOrgSession()

  const { organizationId, userId } = session

  const tciAccess =
    access ??
    (await resolveTimeClockSurfaceAccess({ organizationId, userId }))

  const t = await getTranslations("Dashboard.Hrm.timeClock")

  if (!tciAccess.canEnter) {
    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  const [summaryResult, devicesResult, mappingsResult, exceptionsResult, employeesResult] =
    await Promise.all([
      countTimeClockKpiSummary(organizationId).then(
        (value) => ({ ok: true as const, value }),
        (error) => ({ ok: false as const, error })
      ),
      tciAccess.canRead
        ? listTimeClockDevicesForOrg(organizationId).then(
            (value) => ({ ok: true as const, value }),
            (error) => ({ ok: false as const, error })
          )
        : Promise.resolve({ ok: true as const, value: [] }),
      tciAccess.canRead
        ? listTimeClockMappingsForOrg(organizationId).then(
            (value) => ({ ok: true as const, value }),
            (error) => ({ ok: false as const, error })
          )
        : Promise.resolve({ ok: true as const, value: [] }),
      tciAccess.canRead
        ? listTimeClockExceptionsForOrg(organizationId, {
            state: "submitted",
          }).then(
            (value) => ({ ok: true as const, value }),
            (error) => ({ ok: false as const, error })
          )
        : Promise.resolve({ ok: true as const, value: [] }),
      listActiveEmployeeChoicesForAttendance(organizationId).then(
        (value) => ({ ok: true as const, value }),
        (error) => ({ ok: false as const, error })
      ),
    ])

  for (const result of [
    summaryResult,
    devicesResult,
    mappingsResult,
    exceptionsResult,
    employeesResult,
  ]) {
    if (!result.ok) {
      logUnexpectedServerError(result.error, {
        segment: "hrm/time-clock",
        organizationId,
      })
    }
  }

  const loadFailed = { title: t("loadFailed") }

  const employeeChoices = (employeesResult.ok ? employeesResult.value : []).map(
    (row) => ({
      id: row.id,
      label:
        row.employeeNumber != null
          ? `${row.legalName} · ${row.employeeNumber}`
          : row.legalName,
    })
  )

  const deviceRows = devicesResult.ok ? devicesResult.value : []
  const deviceChoices = deviceRows
    .filter((row) => row.state === "active")
    .map((row) => ({
      id: row.id,
      label: `${row.name} (${row.externalDeviceId})`,
    }))

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <TimeClockKpiSection
        summary={
          summaryResult.ok
            ? summaryResult.value
            : {
                activeDevices: 0,
                activeMappings: 0,
                pendingExceptions: 0,
                failedSyncDevices: 0,
                punchesToday: 0,
              }
        }
        loadError={summaryResult.ok ? undefined : loadFailed}
      />

      <TimeClockDevicesSection
        rows={devicesResult.ok ? devicesResult.value : []}
        canManage={tciAccess.canManageDevices}
        loadError={devicesResult.ok ? undefined : loadFailed}
      />

      <TimeClockMappingsSection
        rows={mappingsResult.ok ? mappingsResult.value : []}
        canManage={tciAccess.canManageMappings}
        employeeChoices={employeeChoices}
        deviceChoices={deviceChoices}
        loadError={mappingsResult.ok ? undefined : loadFailed}
      />

      <TimeClockExceptionsSection
        rows={exceptionsResult.ok ? exceptionsResult.value : []}
        canDecide={tciAccess.canDecideExceptions}
        loadError={exceptionsResult.ok ? undefined : loadFailed}
      />

      {tciAccess.canAudit ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("report.title")}</CardTitle>
            <CardDescription>{t("report.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <TimeClockReportExportForm orgSlug={orgSlug} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
