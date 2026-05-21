import { Suspense } from "react"
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

import { resolveTimeClockSurfaceAccess } from "../data/tci-access.server"
import type { TimeClockSurfaceAccess } from "../data/tci-access.server"

import {
  TimeClockKpiSectionSkeleton,
  TimeClockListSectionSkeleton,
} from "./time-clock-page-loading"
import {
  TimeClockDevicesStreamSection,
  TimeClockExceptionsStreamSection,
  TimeClockKpiStreamSection,
  TimeClockMappingsStreamSection,
  TimeClockSyncBatchesStreamSection,
} from "./time-clock-page-stream-sections"
import { TimeClockReportExportForm } from "./tci-report-export.client"

type TimeClockPageProps = {
  orgSlug: string
  access?: TimeClockSurfaceAccess
  organizationId?: string
  userId?: string
}

/**
 * Time clock workbench — Tier A (access + header) blocks the shell; Tier B
 * sections stream behind Suspense so a slow list query does not block KPI tiles.
 */
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

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <Suspense fallback={<TimeClockKpiSectionSkeleton />}>
        <TimeClockKpiStreamSection organizationId={organizationId} />
      </Suspense>

      <Suspense
        fallback={<TimeClockListSectionSkeleton withHeaderAction />}
      >
        <TimeClockDevicesStreamSection
          organizationId={organizationId}
          canRead={tciAccess.canRead}
          canManageDevices={tciAccess.canManageDevices}
        />
      </Suspense>

      <Suspense
        fallback={<TimeClockListSectionSkeleton withHeaderAction />}
      >
        <TimeClockMappingsStreamSection
          organizationId={organizationId}
          canRead={tciAccess.canRead}
          canManageMappings={tciAccess.canManageMappings}
        />
      </Suspense>

      {tciAccess.canRead ? (
        <Suspense fallback={<TimeClockListSectionSkeleton />}>
          <TimeClockSyncBatchesStreamSection organizationId={organizationId} />
        </Suspense>
      ) : null}

      <Suspense fallback={<TimeClockListSectionSkeleton />}>
        <TimeClockExceptionsStreamSection
          organizationId={organizationId}
          canRead={tciAccess.canRead}
          canDecideExceptions={tciAccess.canDecideExceptions}
          canCorrectAttendance={tciAccess.canCorrectAttendance}
        />
      </Suspense>

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
