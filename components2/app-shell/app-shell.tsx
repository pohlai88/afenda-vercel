import "server-only"

import type { ReactNode } from "react"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import type { RouteEnvelope } from "#lib/route-envelope.shared"

import { AppShellClient } from "./app-shell.client"
import type { AppShellRailConfig } from "./rail.schema"

// ---------------------------------------------------------------------------
// Public API types
// ---------------------------------------------------------------------------

export type AppShellUtilityBarSlots = {
  left: ReactNode
  center?: ReactNode
  right: ReactNode
}

export type AppShellProps = {
  /** Resolved route context from layout.tsx, forwarded to error boundaries. */
  envelope: RouteEnvelope
  /** Null disables the left navigation rail entirely. */
  rail?: AppShellRailConfig | null
  utilityBar: AppShellUtilityBarSlots
  /** Command palette overlay. Pass null to disable. */
  command?: ReactNode | null
  /** Full-viewport overlay slot (e.g. Lynx summon, quick-capture sheets). */
  overlay?: ReactNode | null
  children: ReactNode
}

// ---------------------------------------------------------------------------
// RSC entry — resolves server context, hands off to client chrome.
// ---------------------------------------------------------------------------

export function AppShell({
  envelope,
  rail = null,
  utilityBar,
  command = null,
  overlay = null,
  children,
}: AppShellProps) {
  return (
    <RouteEnvelopeProvider value={envelope}>
      <AppShellClient
        rail={rail}
        utilityBar={utilityBar}
        command={command}
        overlay={overlay}
      >
        {children}
      </AppShellClient>
    </RouteEnvelopeProvider>
  )
}
