import type { ReactNode } from "react"
import type { Metadata } from "next"

import { requireAuthShellSignedInSession } from "#lib/auth"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { SITE_NAME } from "#lib/site"

// Session auth reads cookies — declare dynamic so Next.js skips the static
// prerender attempt and avoids noisy DYNAMIC_SERVER_USAGE error logs in CI.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Onboarding",
  robots: PRIVATE_SURFACE_ROBOTS,
  openGraph: { title: `Onboarding | ${SITE_NAME}` },
}

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireAuthShellSignedInSession()
  return children
}
