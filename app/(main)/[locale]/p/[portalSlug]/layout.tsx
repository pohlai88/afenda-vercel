import type { Metadata } from "next"
import type { ReactNode } from "react"

import { PortalShell } from "#components2/portal-shell"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { ensureAppLocale } from "#lib/i18n/locales.shared"
import { requirePortalContext } from "#lib/portal/server"
import type { RouteEnvelope } from "#lib/route-envelope.shared"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  robots: PRIVATE_SURFACE_ROBOTS,
}

type PortalLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string; portalSlug: string }>
}

export default async function PortalLayout({
  children,
  params,
}: PortalLayoutProps) {
  const { locale: rawLocale, portalSlug } = await params
  const locale = ensureAppLocale(rawLocale)
  const context = await requirePortalContext(portalSlug)

  const envelope: RouteEnvelope = {
    surface: "portal",
    locale,
    orgId: context.organizationId,
    portalSlug: context.portalSlug,
    portalAudience: context.portalAudience,
  }

  return (
    <PortalShell envelope={envelope} context={context}>
      {children}
    </PortalShell>
  )
}
