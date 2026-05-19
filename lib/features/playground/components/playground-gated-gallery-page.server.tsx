import "server-only"

import type { ReactNode } from "react"

import { redirectIfProductionPlaygroundRoute } from "../data/playground-route-gate.server"

/** Production guard wrapper for playground gallery pages. */
export function PlaygroundGatedGalleryPage({
  children,
}: {
  children: ReactNode
}) {
  redirectIfProductionPlaygroundRoute()
  return children
}
