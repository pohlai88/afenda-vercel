import type { Metadata } from "next"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
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
 * Phase 1 of Nexus runtime migration (AGENTS.md §5 → Nexus runtime): chrome
 * (skip-link, Lynx summon, main wrapper) has lifted up to **`NexusShell`** at
 * `app/[locale]/o/[orgSlug]/layout.tsx`. This layout is now a thin
 * surface-scoped envelope — it sets `surface: "dashboard"` so error / loading
 * boundaries can specialize, but does **not** mount its own shell.
 *
 * **`SurfaceChrome`** (`#components/nexus/nexus-surface-chrome`) remains available
 * for surfaces that need skip-link / command palette / keyboard shortcuts / main / Lynx
 * summon **without** the full `NexusShell` (no L1 utility bar or dock).
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

  return <RouteEnvelopeProvider value={envelope}>{children}</RouteEnvelopeProvider>
}
