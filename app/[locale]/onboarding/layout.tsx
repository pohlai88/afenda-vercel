import type { ReactNode } from "react"
import type { Metadata } from "next"

import { requireSignedInSession } from "#lib/tenant"
import { SITE_NAME } from "#lib/site"

export const metadata: Metadata = {
  title: "Onboarding",
  robots: { index: false, follow: false },
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
