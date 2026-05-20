import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { FlexibleWorkPage, resolveFwaSurfaceAccess } from "#features/hrm"
import { getOrgTenantContext } from "#lib/auth"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/i18n/private-surface-robots.shared"

type PageProps = {
  params: Promise<{ locale: string; orgSlug: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.Hrm.flexibleWork")
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default async function OrgAppsHrmFlexibleWorkPage({
  params,
}: PageProps) {
  const { locale, orgSlug } = await params
  ensureAppLocale(locale)

  const session = await getOrgTenantContext()
  const access = await resolveFwaSurfaceAccess({
    organizationId: session.organizationId,
    userId: session.userId,
  })

  return (
    <FlexibleWorkPage
      orgSlug={orgSlug}
      access={access}
      organizationId={session.organizationId}
      userId={session.userId}
    />
  )
}
