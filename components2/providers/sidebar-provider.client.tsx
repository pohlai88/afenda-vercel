"use client"

import type { CSSProperties, ReactNode } from "react"

import { SidebarProvider } from "../ui/sidebar"

// Shell-canonical sidebar dimensions. Change here → every consumer updates.
const SHELL_SIDEBAR_CSS: CSSProperties = {
  "--sidebar-width": "15rem",
  "--sidebar-width-icon": "4rem",
} as CSSProperties

type AppShellSidebarProviderProps = {
  /**
   * Whether the sidebar starts open.
   * Pass false when the shell has no rail config so the rail doesn't flash.
   */
  defaultOpen?: boolean
  children: ReactNode
}

/**
 * Shell-scoped SidebarProvider.
 *
 * Intentionally wraps the ENTIRE shell column (header + sidebar row), not just
 * the sidebar row. This lets utility-bar components call `useSidebar()` to
 * read/control the rail collapse state — the pattern the legacy workbench
 * used a separate context for (`workbench-rail-collapse-context.tsx`).
 */
export function AppShellSidebarProvider({
  defaultOpen = true,
  children,
}: AppShellSidebarProviderProps) {
  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={SHELL_SIDEBAR_CSS}
      className="flex h-svh max-h-svh min-h-0 flex-col overflow-hidden bg-background"
      data-app-shell="root"
    >
      {children}
    </SidebarProvider>
  )
}
