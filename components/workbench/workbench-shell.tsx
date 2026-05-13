import type { ReactNode } from "react"

import { RouteEnvelopeProvider } from "#components/route-envelope-context"
import type { RouteEnvelope } from "#lib/route-envelope.shared"

import type { WorkbenchRailLabels, WorkbenchRailSlots } from "./left-nav-rail"
import {
  WorkbenchCommandLayer,
  type WorkbenchCommandLayerProps,
} from "./workbench-command"
import { WorkbenchShellClient } from "./workbench-shell.client"
import { WorkbenchSkipToMain } from "./workbench-skip-to-main"
import {
  WorkbenchUtilityBar,
  type WorkbenchUtilityBarProps,
} from "./utility-bar/workbench-utility-bar"

export type WorkbenchShellRailConfig = {
  slots: WorkbenchRailSlots
  labels: WorkbenchRailLabels
  storageKey: string
}

type WorkbenchShellPropsBase = {
  envelope: RouteEnvelope
  utilityBar: WorkbenchUtilityBarProps
  rail?: WorkbenchShellRailConfig | null
  command?: WorkbenchCommandLayerProps | null
  enableLynxSummon?: boolean
  orgSlug?: string
  children: ReactNode
}

/** Either a string label or a pre-built node (e.g. Suspense + async i18n). */
export type WorkbenchShellProps =
  | (WorkbenchShellPropsBase & {
      skipToMainLabel: string
      skipToMain?: never
    })
  | (WorkbenchShellPropsBase & {
      skipToMain: ReactNode
      skipToMainLabel?: never
    })

/**
 * WorkbenchShell — canonical post-login shell for every Afenda surface.
 * Import as AppShell from the workbench barrel in route layout files
 * (see app-shell.ts for the stable alias).
 *
 * Composes three regions (viewport-locked; the shell does not scroll the document):
 * 1. Utility bar (top, full-width) — utilityBar prop
 * 2. Rail (left, optional) — rail prop
 * 3. Surface (right, scrollable main) — children
 *
 * Plus skip-to-main, command layer, shortcuts, Lynx summon on org surfaces,
 * mobile rail sheet, and route envelope context.
 */
export function WorkbenchShell(props: WorkbenchShellProps) {
  const {
    envelope,
    utilityBar,
    rail = null,
    command = null,
    enableLynxSummon,
    orgSlug,
    children,
  } = props

  const skipToMain =
    "skipToMain" in props ? (
      props.skipToMain
    ) : (
      <WorkbenchSkipToMain label={props.skipToMainLabel} />
    )

  return (
    <RouteEnvelopeProvider value={envelope}>
      <WorkbenchShellClient
        skipToMain={skipToMain}
        utilityBar={<WorkbenchUtilityBar {...utilityBar} />}
        rail={rail}
        commandLayer={command ? <WorkbenchCommandLayer {...command} /> : null}
        enableLynxSummon={enableLynxSummon}
        orgSlug={orgSlug ?? envelope.orgSlug}
      >
        {children}
      </WorkbenchShellClient>
    </RouteEnvelopeProvider>
  )
}
