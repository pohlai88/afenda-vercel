import type { ReactNode } from "react"

import {
  requireRecentAuthStepUp,
  requireVerifiedEmailForAccount,
} from "#lib/auth"

export default async function AccountOrganizationLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireRecentAuthStepUp({ returnTo: "/account/organization" })
  await requireVerifiedEmailForAccount("/account/organization")
  return children
}
