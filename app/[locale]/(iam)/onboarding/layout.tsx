import type { ReactNode } from "react"
import type { Metadata } from "next"

import { requireSignedInSession } from "#lib/auth-v2"
import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"
import { SITE_NAME } from "#lib/site"

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
  await requireSignedInSession()
  return children
}
