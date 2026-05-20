import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { AbsenceAnalyticsPage, resolveAatSurfaceAccess } from "#features/hrm"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { getOrgTenantContext } from "#lib/auth"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { searchParamFirst } from "#lib/i18n/app-search-params.shared"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

type PageProps = {
  params: Promise<{ locale: string; orgSlug: string }>
  searchParams: Promise<{
    period?: string | string[]
    scope?: string | string[]
  }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmAbsenceAnalyticsPage({
  params,
  searchParams,
}: PageProps) {
  const [{ locale, orgSlug }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ])
  ensureAppLocale(locale)

  const session = await getOrgTenantContext()
  const access = await resolveAatSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })

  const t = await getTranslations("Dashboard.Hrm.absenceAnalytics")

  if (!access.canEnter) {
    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  const scopeRaw = searchParamFirst(resolvedSearchParams, "scope")

  return (
    <AbsenceAnalyticsPage
      orgSlug={orgSlug}
      organizationId={session.organizationId}
      userId={session.userId}
      sessionId={session.sessionId}
      period={searchParamFirst(resolvedSearchParams, "period")}
      scope={scopeRaw}
      access={access}
    />
  )
}
