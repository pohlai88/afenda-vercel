import { AppSubLayout } from "#components/workbench"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { requireOrgSession } from "#lib/tenant"

export const dynamic = "force-dynamic"

export default async function OrganizationMarketplaceLayout({
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
