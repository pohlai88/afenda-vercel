"use client"

import type { ReactNode } from "react"

import { AppShellThemeBridge } from "./app-shell-theme-bridge.client"
import { AppShellSidebarProvider } from "./sidebar-provider.client"
import { AppShellTooltipProvider } from "./tooltip-provider.client"

type AppShellProvidersProps = {
  /** Whether the sidebar starts open. Pass false when there is no rail. */
  sidebarDefaultOpen?: boolean
  children: ReactNode
}

/**
 * AppShellProviders — single mount point for all shell-level React contexts.
 *
 * Composes individual providers in the correct nesting order.
 * Add new providers here (e.g. QueryClientProvider) without touching
 * AppShellClient — one file to change, one place to reason about.
 *
 * Theme: {@link AppShellRootThemeProvider} in `app/layout.tsx` owns `next-themes`.
 * {@link AppShellThemeBridge} mirrors `useTheme()` into {@link useAppShellStore}.
 *
 * Mount order (outer → inner):
 *   AppShellTooltipProvider  (shadcn tooltip — 300ms delay in shell subtree)
 *   AppShellSidebarProvider  (rail collapse / expand + shell viewport column)
 *   AppShellThemeBridge      (null — syncs theme into Zustand)
 */
export function AppShellProviders({
  sidebarDefaultOpen = true,
  children,
}: AppShellProvidersProps) {
  return (
    <AppShellTooltipProvider>
      <AppShellSidebarProvider defaultOpen={sidebarDefaultOpen}>
        <AppShellThemeBridge />
        {children}
      </AppShellSidebarProvider>
    </AppShellTooltipProvider>
  )
}
