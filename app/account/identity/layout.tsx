import type { ReactNode } from "react"

import { requireRecentAuthStepUp } from "#lib/auth"

export default async function AccountIdentityLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireRecentAuthStepUp({ returnTo: "/account/identity" })
  return children
}
