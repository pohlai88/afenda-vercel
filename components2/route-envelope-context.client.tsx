"use client"

import { createContext, useContext } from "react"

import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

/**
 * Context bridge that carries server-resolved RouteEnvelope data into the
 * client component tree — primarily so error.tsx boundaries can include
 * surface/org context in error reports without re-fetching on the client.
 *
 * Usage in layout.tsx (Server Component), e.g. org ERP routes:
 *   <RouteEnvelopeProvider value={envelope}>
 *     <NexusShell ...>{children}</NexusShell>
 *   </RouteEnvelopeProvider>
 *
 * Usage in error.tsx or any Client Component:
 *   const envelope = useRouteEnvelope()
 */
const RouteEnvelopeContext = createContext<RouteEnvelope | null>(null)

export function RouteEnvelopeProvider({
  value,
  children,
}: {
  value: RouteEnvelope
  children: React.ReactNode
}) {
  return (
    <RouteEnvelopeContext.Provider value={value}>
      {children}
    </RouteEnvelopeContext.Provider>
  )
}

export function useRouteEnvelope(): RouteEnvelope | null {
  return useContext(RouteEnvelopeContext)
}
