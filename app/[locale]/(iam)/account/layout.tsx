import type { ReactNode } from "react"
import type { Metadata } from "next"

import { requireSignedInSession } from "#lib/auth-v2"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { SITE_NAME } from "#lib/site"

export const metadata: Metadata = {
  title: "Account",
  robots: PRIVATE_SURFACE_ROBOTS,
  openGraph: { title: `Account | ${SITE_NAME}` },
}

export const dynamic = "force-dynamic"

/**
 * Locale-internal `/account` layout.
 *
 * The proxy already gates `/account` for session cookie presence; this layout
 * adds defense-in-depth by validating the session record itself. Subsection
 * layouts (identity / security) chain in step-up + verified-email guards.
 */
export default async function AccountLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireSignedInSession()
  return <>{children}</>
}
