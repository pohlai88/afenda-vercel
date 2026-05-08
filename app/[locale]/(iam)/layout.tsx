import type { Metadata } from "next"

import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"

/**
 * Route group layout (`(iam)` is invisible in URLs): shared **private-surface** robots for
 * account and onboarding — nested layouts/pages supply `title` / `openGraph`.
 */
export async function generateMetadata({
  params: _params,
}: Pick<LayoutProps<"/[locale]">, "params">): Promise<Metadata> {
  void _params
  return {
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default function IamRouteGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
