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
import type { AppShellChromeProps } from "./appshell-props.shared"
import { AppShellUtilityBar } from "./top-utils-bar/appshell-utility-bar"
import { AppShellPrimaryLeftRail } from "./left-rail-bar/appshell-primary-left-rail.client"
import { AppShellContextMenu } from "./left-rail-bar/appshell-context-menu.client"
import { LynxSummonProvider } from "#components2/nexus/nexus-lynx-summon-context"

import { AppShellProviders } from "#components2/providers"
import type { AppShellPrimaryLeftRailConfig } from "./left-rail-bar/appshell-primary-left-rail.schema"
import { useAppShellStore } from "../stores/app-shell.store"
import { AppShellGlobalShortcuts } from "./appshell-global-shortcuts.client"

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
  }, [railMode, setOpen])

  return null
}

// ---------------------------------------------------------------------------
// AppShellPrimaryLeftRailSidebar — sidebar element with optional hover-expand wiring
// ---------------------------------------------------------------------------

function AppShellPrimaryLeftRailSidebar({
  config,
}: {
  config: AppShellPrimaryLeftRailConfig
}) {
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
        <AppShellPrimaryLeftRail config={config} collapsed={collapsed} />
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
// `RailController` pushes `railMode` → `open`, but **SidebarRail** and **⌘/Ctrl+B**
// call `toggleSidebar()` and flip **`open` only**. If we only read `railMode` here,
// `railMode === "expanded"` while `open === false` makes the first header click
// redundantly set `collapsed` mode instead of `setOpen(true)` — collapsible feels
// broken (two clicks to re-expand; wrong panel icon).
//
// Rule: in **`expanded`** rail mode, if the sidebar is already narrow (`!open`),
// restore width with **`setOpen(true)`** without changing `railMode`.
// Icon reflects actual **`open`**, not `railMode` alone.
// ---------------------------------------------------------------------------

function UtilityBarRailTrigger() {
  const { open, setOpen } = useSidebar()
  const railMode = useAppShellStore((s) => s.railMode)
  const setRailMode = useAppShellStore((s) => s.setRailMode)

  function handleClick() {
    if (railMode === "expanded") {
      if (open) setRailMode("collapsed")
      else setOpen(true)
      return
    }
    // collapsed or hover → pin expanded (persistent full-width rail mode)
    setRailMode("expanded")
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleClick}
      aria-label="Toggle navigation rail"
      className="shrink-0 text-sidebar-foreground hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground"
    >
      {open ? (
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
//   ├── {@link AppShellUtilityBar} — L1 slots + rail trigger (inside SidebarProvider)
//   ├── <div.flex.flex-1.bg-sidebar>    — sidebar + content row
//   │   ├── <AppShellPrimaryLeftRailSidebar>       — left rail (collapsible icon, hover aware)
//   │   └── <SidebarInset>             — main content scroll area
//   ├── {command}   ← command palette dialog (portalled)
//   └── {overlay}   ← Lynx summon, modals, etc.
// ---------------------------------------------------------------------------

export type AppShellClientProps = AppShellChromeProps & {
  skipToMain?: ReactNode
  orgSlug?: string
  enableLynxSummon?: boolean
}

export function AppShellClient({
  skipToMain,
  orgSlug,
  enableLynxSummon = false,
  rail,
  utilityBar,
  command,
  overlay,
  children,
}: AppShellClientProps) {
  const density = useAppShellStore((s) => s.density)
  const utilityBarRailTrigger = rail ? <UtilityBarRailTrigger /> : null

  const shell = (
    <AppShellProviders sidebarDefaultOpen={rail !== null}>
      {/* Mode controller — invisible, effect-only */}
      {rail ? <RailController /> : null}
      {skipToMain}
      {orgSlug ? <AppShellGlobalShortcuts orgSlug={orgSlug} /> : null}

      <AppShellUtilityBar
        left={
          <>
            {utilityBarRailTrigger}
            {utilityBar.left}
          </>
        }
        center={utilityBar.center}
        right={utilityBar.right}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Sidebar + content row                                               */}
      {/*                                                                     */}
      {/* bg-sidebar: when SidebarInset has md:rounded-tl-2xl, the corner    */}
      {/* reveals whatever sits behind it. bg-sidebar makes that corner      */}
      {/* match the left rail background, not the page background.           */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex min-h-0 flex-1 bg-sidebar">
        {rail ? <AppShellPrimaryLeftRailSidebar config={rail} /> : null}

        {/*
         * SidebarInset = <main>
         * - min-w-0 prevents horizontal overflow in narrow flex contexts
         * - min-h-0 overrides SidebarInset's default min-h-svh
         * - outline-none suppresses focus ring from tabIndex={-1} skip-link
         * - af-appshell-main-scroll = custom scrollbar styling (globals.css)
         * - md:rounded-tl-2xl + border = content pane inset chrome
         */}
        <SidebarInset
          id="app-shell-main"
          data-density={density}
          tabIndex={-1}
          className={cn(
            "min-h-0 min-w-0 overflow-y-auto overscroll-y-contain outline-none",
            "af-appshell-main-scroll",
            rail &&
              "md:rounded-tl-2xl md:border-t md:border-l md:border-border/60"
          )}
        >
          {/* Global right-click: anywhere in the content area → Add to memory */}
          <AppShellContextMenu>{children}</AppShellContextMenu>
        </SidebarInset>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Overlay layers — portalled above everything else                   */}
      {/* ------------------------------------------------------------------ */}
      {command}
      {overlay}
    </AppShellProviders>
  )

  if (enableLynxSummon) {
    return <LynxSummonProvider>{shell}</LynxSummonProvider>
  }

  return shell
}
