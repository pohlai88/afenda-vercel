import type { ReactNode } from "react"

import { requirePortalContext } from "#lib/portal/server"

type PortalAuthLayoutProps = {
  children: ReactNode
  params: Promise<{ locale: string; portalSlug: string }>
}

export default async function PortalAuthLayout({
  children,
  params,
}: PortalAuthLayoutProps) {
  const { portalSlug } = await params
  await requirePortalContext(portalSlug)

  return children
}
