import type { Metadata } from "next"

import { AppSubLayout } from "#components/workbench"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import type { RouteEnvelope } from "#lib/route-envelope.shared"
import { SITE_NAME } from "#lib/site"
import { requireOrgSession } from "#lib/tenant"

export const metadata: Metadata = {
  title: "Dashboard",
  openGraph: { title: `Dashboard | ${SITE_NAME}` },
}

/**
 * Dashboard surface envelope.
 *
 * Workbench owns the shared authenticated shell chrome above this segment.
 * `AppShell` lives at `app/[locale]/o/[orgSlug]/layout.tsx`; this
 * layout adds only the nested dashboard boundary via `AppSubLayout`
 * so dashboard children inherit the same shell-owned route envelope and
 * composition rules without introducing a parallel shell.
 */
export default async function OrgDashboardLayout({
  children,
  params,
}: LayoutProps<"/[locale]/o/[orgSlug]/dashboard">) {
  const { locale: localeRaw, orgSlug } = await params
  const locale = ensureAppLocale(localeRaw)

  const org = await requireOrgSession()

  const envelope: RouteEnvelope = {
    surface: "dashboard",
    locale,
    orgSlug,
    orgId: org.organizationId,
  }

  return <AppSubLayout envelope={envelope}>{children}</AppSubLayout>
}
