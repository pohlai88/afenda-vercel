"use client"

import { useEffect, type ReactNode } from "react"
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"

import { cn } from "#lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  useSidebar,
} from "#components2/ui/sidebar"
import { Button } from "#components2/ui/button"
import type { AppShellUtilityBarSlots } from "./app-shell"
import { AppShellRail } from "./nav-rail.client"
import { GlobalLaneMenu } from "./global-lane-menu.client"
import { AppShellProviders } from "../providers/app-shell-providers.client"
import type { AppShellRailConfig } from "./rail.schema"
import { useAppShellStore } from "../stores/app-shell.store"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AppShellClientProps = {
  rail: AppShellRailConfig | null
  utilityBar: AppShellUtilityBarSlots
  command: ReactNode | null
  overlay: ReactNode | null
  children: ReactNode
}

// ---------------------------------------------------------------------------
// RailController — syncs railMode (store) → sidebar open state (SidebarProvider)
//
// Must live inside AppShellProviders so useSidebar() is available.
// Only runs the effect when railMode changes — hover handlers may freely
// call setOpen() in between without triggering a re-sync loop.
// ---------------------------------------------------------------------------

function RailController() {
  const { setOpen } = useSidebar()
  const railMode = useAppShellStore((s) => s.railMode)

  useEffect(() => {
    // "hover" starts collapsed; hover handlers take over from there.
    setOpen(railMode === "expanded")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [railMode])

  return null
}

// ---------------------------------------------------------------------------
// AppShellRailSidebar — sidebar element with optional hover-expand wiring
// ---------------------------------------------------------------------------

function AppShellRailSidebar({ config }: { config: AppShellRailConfig }) {
  const { state, setOpen } = useSidebar()
  const railMode = useAppShellStore((s) => s.railMode)
  const collapsed = state === "collapsed"

  const hoverHandlers =
    railMode === "hover"
      ? {
          onMouseEnter: () => setOpen(true),
          onMouseLeave: () => setOpen(false),
        }
      : {}

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 border-none"
      {...hoverHandlers}
    >
      {/*
       * L1 alignment spacer — the Sidebar is fixed inset-y-0 (starts at
       * viewport top) while the utility bar covers the top h-(--af-l1-height).
       * This empty header pushes the rail content down to start exactly where
       * the utility bar ends, so the search bar aligns with the content area.
       */}
      <SidebarHeader className="h-(--af-l1-height) shrink-0 p-0" />
      <SidebarContent>
        <AppShellRail config={config} collapsed={collapsed} mode="primary" />
      </SidebarContent>

      {config.slots.footer ? (
        <SidebarFooter className="gap-0 border-0 p-0 shadow-none">
          <div className="p-1">{config.slots.footer}</div>
        </SidebarFooter>
      ) : null}
    </Sidebar>
  )
}

// ---------------------------------------------------------------------------
// UtilityBarRailTrigger — mode-aware rail toggle
//
// Uses setRailMode rather than toggleSidebar() so it doesn't fight
// RailController. Clicking while in "hover" mode pins the rail open
// (switches to "expanded").
// ---------------------------------------------------------------------------

function UtilityBarRailTrigger() {
  const railMode = useAppShellStore((s) => s.railMode)
  const setRailMode = useAppShellStore((s) => s.setRailMode)

  function handleClick() {
    if (railMode === "expanded") setRailMode("collapsed")
    else if (railMode === "collapsed") setRailMode("expanded")
    else setRailMode("expanded") // hover → pin open
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      aria-label="Toggle navigation rail"
      className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground"
    >
      {railMode === "expanded" ? (
        <PanelLeftCloseIcon aria-hidden data-icon="inline-start" />
      ) : (
        <PanelLeftOpenIcon aria-hidden data-icon="inline-start" />
      )}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// Client chrome
//
// Layout contract:
//   AppShellProviders (SidebarProvider + TooltipProvider wrapping full column)
//   ├── RailController (invisible — syncs railMode → sidebar open state)
//   ├── <header>  ← utility bar — INSIDE SidebarProvider so useSidebar works
//   │   ├── [RailTrigger] [left slot]   — left wing
//   │   ├── [center slot]               — absolute center (optional)
//   │   └── [right slot]                — right wing
//   ├── <div.flex.flex-1.bg-sidebar>    — sidebar + content row
//   │   ├── <AppShellRailSidebar>       — left rail (collapsible icon, hover aware)
//   │   └── <SidebarInset>             — main content scroll area
//   ├── {command}   ← command palette dialog (portalled)
//   └── {overlay}   ← Lynx summon, modals, etc.
// ---------------------------------------------------------------------------

export function AppShellClient({
  rail,
  utilityBar,
  command,
  overlay,
  children,
}: AppShellClientProps) {
  return (
    <AppShellProviders sidebarDefaultOpen={rail !== null}>
      {/* Mode controller — invisible, effect-only */}
      {rail ? <RailController /> : null}

      {/* ------------------------------------------------------------------ */}
      {/* L1 Utility bar                                                      */}
      {/* ------------------------------------------------------------------ */}
      <header
        aria-label="Application utility bar"
        data-app-shell="utility-bar"
        className="sticky top-0 z-40 shrink-0 bg-sidebar"
      >
        <div className="mx-auto max-w-screen-2xl px-2.5 sm:px-4">
          <div className="relative flex h-(--af-l1-height) items-center justify-between gap-2">
            {/* Left wing: trigger (when rail is present) + caller left slot */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {rail ? <UtilityBarRailTrigger /> : null}
              {utilityBar.left}
            </div>

            {/* Absolute center slot */}
            {utilityBar.center ? (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-14 sm:px-24">
                <div className="pointer-events-auto">{utilityBar.center}</div>
              </div>
            ) : null}

            {/* Right wing */}
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
              {utilityBar.right}
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Sidebar + content row                                               */}
      {/*                                                                     */}
      {/* bg-sidebar: when SidebarInset has md:rounded-tl-2xl, the corner    */}
      {/* reveals whatever sits behind it. bg-sidebar makes that corner      */}
      {/* match the left rail background, not the page background.           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex min-h-0 flex-1 bg-sidebar">
        {rail ? <AppShellRailSidebar config={rail} /> : null}

        {/*
         * SidebarInset = <main>
         * - min-w-0 prevents horizontal overflow in narrow flex contexts
         * - min-h-0 overrides SidebarInset's default min-h-svh
         * - outline-none suppresses focus ring from tabIndex={-1} skip-link
         * - af-workbench-main-scroll = custom scrollbar styling (globals.css)
         * - md:rounded-tl-2xl + border = content pane inset chrome
         */}
        <SidebarInset
          id="app-shell-main"
          tabIndex={-1}
          className={cn(
            "min-h-0 min-w-0 overflow-y-auto overscroll-y-contain outline-none",
            "af-workbench-main-scroll",
            rail &&
              "md:rounded-tl-2xl md:border-t md:border-l md:border-border/60"
          )}
        >
          {/* Global right-click: anywhere in the content area → Add to memory */}
          <GlobalLaneMenu>{children}</GlobalLaneMenu>
        </SidebarInset>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Overlay layers — portalled above everything else                   */}
      {/* ------------------------------------------------------------------ */}
      {command}
      {overlay}
    </AppShellProviders>
  )
}
