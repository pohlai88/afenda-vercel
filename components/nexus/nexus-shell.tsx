import type { ReactNode } from "react"

import { LynxSummon } from "#components/nexus/nexus-lynx-summon.client"
import { LynxSummonProvider } from "#components/nexus/nexus-lynx-summon-context"

import { NexusCommandLayer } from "./nexus-command-layer"
import { NexusCommandProvider } from "./nexus-command-context"
import { NexusGlobalShortcuts } from "./nexus-global-shortcuts.client"
import { NexusDock } from "./nexus-dock"
import { SkipToMain } from "./nexus-skip-to-main"
import { NexusUtilityBar } from "./nexus-utility-bar"

/**
 * Org-scoped operating shell: utility bar, scrollable main, command palette,
 * Lynx summon, and dock slot. Mount once at `[orgSlug]/layout` so chrome survives
 * surface navigations without remounting.
 *
 * For routes that cannot use this shell, {@link SurfaceChrome} composes skip-link,
 * command palette, global shortcuts, main, and Lynx summon without the utility bar or dock.
 */
export type NexusShellProps = {
  /** Localized label for the keyboard skip-link. */
  skipToMainLabel: string
  orgSlug: string
  orgName: string
  orgId: string
  userId: string
  userEmail: string
  children: ReactNode
}

export function NexusShell({
  skipToMainLabel,
  orgSlug,
  orgName,
  orgId,
  userId,
  userEmail,
  children,
}: NexusShellProps) {
  return (
    <NexusCommandProvider>
      <LynxSummonProvider>
        <div
          className="flex min-h-svh flex-col bg-background"
          data-nexus-capture-root="workspace"
        >
          <SkipToMain label={skipToMainLabel} />

          <NexusUtilityBar
            orgSlug={orgSlug}
            orgName={orgName}
            orgId={orgId}
            userId={userId}
            userEmail={userEmail}
          />

          <NexusGlobalShortcuts orgSlug={orgSlug} />

          <main
            id="dashboard-main"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-y-auto outline-none"
            data-nexus-capture-root="content"
          >
            {children}
          </main>

          <NexusCommandLayer orgSlug={orgSlug} />
          <LynxSummon />
          <NexusDock />
        </div>
      </LynxSummonProvider>
    </NexusCommandProvider>
  )
}
