"use client"

import type { ReactNode } from "react"

import { LynxSummon } from "#components/nexus/nexus-lynx-summon.client"
import { LynxSummonProvider } from "#components/nexus/nexus-lynx-summon-context"
import { cn } from "#lib/utils"

import { WORKBENCH_CONTENT_PANE_INSET_CLASS } from "./utility-bar/workbench-utility-round-control-class"
import { WorkbenchRail } from "./left-nav-rail/workbench-rail"
import { WorkbenchCommandProvider } from "./workbench-command"
import { WorkbenchGlobalShortcuts } from "./workbench-global-shortcuts.client"
import {
  WorkbenchMobileRailProvider,
  WorkbenchMobileRailSheet,
} from "./workbench-mobile-rail"
import {
  WorkbenchRailCollapseUiProvider,
  useWorkbenchRailCollapseState,
} from "./workbench-rail-collapse-context"
import type { WorkbenchShellRailConfig } from "./workbench-shell"

type WorkbenchShellClientProps = {
  skipToMain: ReactNode
  utilityBar: ReactNode
  rail: WorkbenchShellRailConfig | null
  commandLayer: ReactNode
  enableLynxSummon?: boolean
  orgSlug?: string
  children: ReactNode
}

function WorkbenchShellClientInner({
  skipToMain,
  utilityBar,
  rail,
  commandLayer,
  enableLynxSummon,
  orgSlug,
  children,
}: WorkbenchShellClientProps) {
  const { railMode, railCollapseApi } = useWorkbenchRailCollapseState(
    rail
      ? {
          storageKey: rail.storageKey,
          collapseLabel: rail.labels.collapseLabel,
          expandLabel: rail.labels.expandLabel,
        }
      : null
  )

  const shellContent = (
    <WorkbenchRailCollapseUiProvider shellApi={railCollapseApi}>
      <WorkbenchMobileRailProvider>
        <div
          className="flex h-svh max-h-svh min-h-0 flex-col overflow-hidden bg-background"
          data-workbench-capture-root="workspace"
        >
          {skipToMain}
          {utilityBar}
          {orgSlug ? <WorkbenchGlobalShortcuts orgSlug={orgSlug} /> : null}
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 overflow-hidden",
              rail ? "md:bg-sidebar" : undefined
            )}
          >
            {rail ? (
              <>
                <div className="hidden flex-none md:flex">
                  <WorkbenchRail
                    slots={rail.slots}
                    labels={rail.labels}
                    collapsed={railMode !== "expanded"}
                    interactionMode={railMode}
                  />
                </div>
                <WorkbenchMobileRailSheet title={rail.labels.ariaLabel}>
                  <WorkbenchRail
                    slots={rail.slots}
                    labels={rail.labels}
                    collapsed={false}
                    interactionMode="expanded"
                    assignNavLandmarkId={false}
                  />
                </WorkbenchMobileRailSheet>
              </>
            ) : null}

            <div
              className={cn(
                "flex min-w-0 flex-1 flex-col",
                rail
                  ? cn("bg-background", WORKBENCH_CONTENT_PANE_INSET_CLASS)
                  : undefined
              )}
            >
              <main
                id="dashboard-main"
                tabIndex={-1}
                className="af-workbench-main-scroll flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto outline-none"
                data-workbench-capture-root="content"
              >
                {children}
              </main>
            </div>
          </div>

          {commandLayer}
          {enableLynxSummon ? <LynxSummon /> : null}
        </div>
      </WorkbenchMobileRailProvider>
    </WorkbenchRailCollapseUiProvider>
  )

  if (enableLynxSummon) {
    return <LynxSummonProvider>{shellContent}</LynxSummonProvider>
  }

  return shellContent
}

export function WorkbenchShellClient(props: WorkbenchShellClientProps) {
  return (
    <WorkbenchCommandProvider>
      <WorkbenchShellClientInner {...props} />
    </WorkbenchCommandProvider>
  )
}
