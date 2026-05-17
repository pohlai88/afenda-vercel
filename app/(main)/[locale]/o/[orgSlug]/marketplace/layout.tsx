import { Suspense } from "react"

import { AppSubLayout, AppSubLayoutShellSkeleton } from "#app-shell"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"
import { requireOrgSession } from "#lib/auth"


export default function OrganizationMarketplaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  return (
    <Suspense
      fallback={
        <AppSubLayoutShellSkeleton statusLabel="Loading marketplace" />
      }
    >
      <OrganizationMarketplaceLayoutInner params={params}>
        {children}
      </OrganizationMarketplaceLayoutInner>
    </Suspense>
  )
}

async function OrganizationMarketplaceLayoutInner({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string; orgSlug: string }>
}) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)
  const session = await requireOrgSession()

  const envelope: RouteEnvelope = {
    surface: "marketplace",
    locale,
    orgSlug,
    orgId: session.organizationId,
  }

  return <AppSubLayout envelope={envelope}>{children}</AppSubLayout>
}
