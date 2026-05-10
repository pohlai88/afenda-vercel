"use client"

import type { ReactNode } from "react"

import { LynxSummon } from "./nexus-lynx-summon.client"
import { LynxSummonProvider } from "./nexus-lynx-summon-context"
import { NexusCommandLayer } from "./nexus-command-layer"
import { NexusCommandProvider } from "./nexus-command-context"
import { NexusGlobalShortcuts } from "./nexus-global-shortcuts.client"
import { SkipToMain } from "./nexus-skip-to-main"

type SurfaceChromeProps = {
  children: ReactNode
  skipToMainLabel: string
  /**
   * Active org URL slug — drives command palette targets and {@link NexusGlobalShortcuts}
   * (G-chords, quick create). Do not use `SurfaceChrome` inside {@link NexusShell}; the
   * shell already provides this stack.
   */
  orgSlug: string
}

/**
 * Standalone execution-layer chrome: skip link, command palette runtime, global keyboard
 * shortcuts, main landmark, Lynx summon. Omits L1 utility bar, dock, and org switcher rail
 * — use when a route cannot mount {@link NexusShell} but should keep the same navigation
 * and summon affordances.
 */
export function SurfaceChrome({
  children,
  skipToMainLabel,
  orgSlug,
}: SurfaceChromeProps) {
  return (
    <NexusCommandProvider>
      <LynxSummonProvider>
        <div className="flex min-h-svh flex-col bg-background">
          <SkipToMain label={skipToMainLabel} />

          <NexusGlobalShortcuts orgSlug={orgSlug} />

          <main
            id="dashboard-main"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-y-auto p-6 outline-none"
          >
            {children}
          </main>

          <NexusCommandLayer orgSlug={orgSlug} />
          <LynxSummon />
        </div>
      </LynxSummonProvider>
    </NexusCommandProvider>
  )
}
