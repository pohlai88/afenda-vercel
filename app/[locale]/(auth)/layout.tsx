import type { Metadata } from "next"

import { PRIVATE_SURFACE_ROBOTS } from "#lib/app-metadata-surface.shared"

/**
 * Route group layout (URL segment `(auth)` is invisible): centralizes **private-surface**
 * defaults for sign-in, sign-up, password flows, verification, etc.
 *
 * Nested layouts/pages may override `title` / `openGraph`; robots stay non-indexed unless
 * explicitly overridden downstream (avoid indexing transient auth URLs).
 */
export async function generateMetadata({
  params: _params,
}: Pick<LayoutProps<"/[locale]">, "params">): Promise<Metadata> {
  void _params
  return {
    robots: PRIVATE_SURFACE_ROBOTS,
  }
}

export default function AuthRouteGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
