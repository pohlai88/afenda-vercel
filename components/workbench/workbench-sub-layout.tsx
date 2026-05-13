import type { ReactNode } from "react"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import type { RouteEnvelope } from "#lib/route-envelope.shared"

import {
  WorkbenchCommandLayer,
  type WorkbenchCommandLayerProps,
} from "./workbench-command"
import type { WorkbenchShellRailConfig } from "./workbench-shell"
import { WorkbenchSubLayoutClient } from "./workbench-sub-layout.client"

export type WorkbenchSubLayoutProps = {
  envelope: RouteEnvelope
  rail?: WorkbenchShellRailConfig | null
  command?: WorkbenchCommandLayerProps | null
  children: ReactNode
}

/**
 * WorkbenchSubLayout — rail + content arrangement for layouts that nest
 * inside an existing org workbench shell (`AppShell` / `WorkbenchShell` at
 * `app/[locale]/o/[orgSlug]/layout.tsx` — org admin, HRM, dashboard envelope, etc.).
 *
 * Unlike the outer shell, this does NOT render the viewport wrapper, utility
 * bar, dock, skip-to-main, or Lynx summon (those stay with the parent shell).
 *
 * It owns nested route envelope context and optional rail/command chrome.
 * When `rail` is null, it acts as a thin nested shell boundary.
 */
export function WorkbenchSubLayout({
  envelope,
  rail = null,
  command = null,
  children,
}: WorkbenchSubLayoutProps) {
  return (
    <RouteEnvelopeProvider value={envelope}>
      <WorkbenchSubLayoutClient
        rail={rail}
        commandLayer={command ? <WorkbenchCommandLayer {...command} /> : null}
      >
        {children}
      </WorkbenchSubLayoutClient>
    </RouteEnvelopeProvider>
  )
}
