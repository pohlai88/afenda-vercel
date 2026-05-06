import type { ReactNode } from "react"

import { requireRecentAuthStepUp, requireVerifiedEmailForAccount } from "#lib/auth"

export default async function AccountSecurityLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireRecentAuthStepUp({ returnTo: "/account/security" })
  await requireVerifiedEmailForAccount("/account/security")
  return children
}
