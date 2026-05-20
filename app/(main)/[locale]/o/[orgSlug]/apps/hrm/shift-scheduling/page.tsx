import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { ShiftSchedulingPage, resolveSftSurfaceAccess } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { getOrgTenantContext } from "#lib/auth"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"
import { searchParamFirst } from "#lib/i18n/app-search-params.shared"

type PageProps = {
  params: Promise<{ locale: string; orgSlug: string }>
  searchParams: Promise<{
    rangeStart?: string
    rangeEnd?: string
    departmentId?: string
    jobGradeId?: string
    locationCode?: string
    legalEntityOrgUnitId?: string
    teamOrgUnitId?: string
    positionId?: string
  }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmShiftSchedulingPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, orgSlug } = await params
  ensureAppLocale(locale)

  const sp = await searchParams
  const rangeStart = searchParamFirst(sp, "rangeStart")
  const rangeEnd = searchParamFirst(sp, "rangeEnd")
  const departmentId = searchParamFirst(sp, "departmentId")
  const jobGradeId = searchParamFirst(sp, "jobGradeId")
  const locationCode = searchParamFirst(sp, "locationCode")
  const legalEntityOrgUnitId = searchParamFirst(sp, "legalEntityOrgUnitId")
  const teamOrgUnitId = searchParamFirst(sp, "teamOrgUnitId")
  const positionId = searchParamFirst(sp, "positionId")

  const session = await getOrgTenantContext()
  const access = await resolveSftSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })

  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")

  if (!access.canEnter) {
    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  return (
    <ShiftSchedulingPage
      orgSlug={orgSlug}
      access={access}
      organizationId={session.organizationId}
      userId={session.userId}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      rosterFilters={{
        departmentId: departmentId ?? null,
        jobGradeId: jobGradeId ?? null,
        locationCode: locationCode ?? null,
        legalEntityOrgUnitId: legalEntityOrgUnitId ?? null,
        teamOrgUnitId: teamOrgUnitId ?? null,
        positionId: positionId ?? null,
      }}
    />
  )
}
