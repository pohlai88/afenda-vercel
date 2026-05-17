import "server-only"

import { LynxSummon } from "#components2/nexus/nexus-lynx-summon.client"
import { RouteEnvelopeProvider } from "#components2/route-envelope-context.client"
import type { RouteEnvelope } from "#lib/erp/route-envelope.shared"

import { AppShellClient } from "./appshell.client"
import { AppShellSkipToMain } from "./appshell-skip-to-main"
import type { AppShellChromePropsInput } from "./appshell-props.shared"

export type AppShellProps = {
  envelope: RouteEnvelope
  skipToMainLabel?: string
  enableLynxSummon?: boolean
  orgSlug?: string
} & AppShellChromePropsInput

export function AppShell({
  envelope,
  skipToMainLabel,
  enableLynxSummon = false,
  orgSlug,
  rail = null,
  utilityBar,
  command = null,
  overlay = null,
  children,
}: AppShellProps) {
  const chrome = {
    rail,
    utilityBar,
    command,
    overlay: overlay ?? (enableLynxSummon ? <LynxSummon /> : null),
  } satisfies Omit<AppShellChromePropsInput, "children">

  return (
    <RouteEnvelopeProvider value={envelope}>
      <AppShellClient
        skipToMain={
          skipToMainLabel ? <AppShellSkipToMain label={skipToMainLabel} /> : null
        }
        enableLynxSummon={enableLynxSummon}
        orgSlug={orgSlug ?? envelope.orgSlug}
        rail={chrome.rail ?? null}
        utilityBar={chrome.utilityBar}
        command={chrome.command ?? null}
        overlay={chrome.overlay ?? null}
      >
        {children}
      </AppShellClient>
    </RouteEnvelopeProvider>
  )
}
