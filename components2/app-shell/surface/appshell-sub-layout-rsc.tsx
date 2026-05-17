import "server-only"

import type { ReactNode } from "react"

import { RouteEnvelopeProvider } from "#components2/route-envelope-context.client"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

import type { AppShellPrimaryLeftRailConfig } from "../left-rail-bar/appshell-primary-left-rail.schema"
import { AppSubLayoutClient } from "./appshell-sub-layout.client"

export type AppSubLayoutProps = {
  envelope?: RouteEnvelope
  rail?: AppShellPrimaryLeftRailConfig | null
  command?: ReactNode | null
  children: ReactNode
}

export function AppSubLayout({
  envelope,
  rail = null,
  command = null,
  children,
}: AppSubLayoutProps) {
  const inner = (
    <AppSubLayoutClient rail={rail} command={command}>
      {children}
    </AppSubLayoutClient>
  )

  if (!envelope) return inner

  return <RouteEnvelopeProvider value={envelope}>{inner}</RouteEnvelopeProvider>
}
