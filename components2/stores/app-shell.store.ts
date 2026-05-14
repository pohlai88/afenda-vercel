"use client"

import { create } from "zustand"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Controls how the left navigation rail behaves:
 * - `expanded`  — always visible at full width
 * - `collapsed` — icon-only; never expands unless the user changes mode
 * - `hover`     — icon-only at rest, expands while the cursor is over it
 */
export type RailMode = "expanded" | "collapsed" | "hover"

export type AppShellState = {
  /** Whether the command palette dialog is open. */
  commandOpen: boolean
  /** Notification badge count — updated by utility bar polling or SSE. */
  notificationCount: number
  /**
   * Preferred navigation-rail display mode.
   * `RailController` in app-shell.client.tsx syncs this to the SidebarProvider.
   */
  railMode: RailMode
}

type AppShellActions = {
  openCommand: () => void
  closeCommand: () => void
  toggleCommand: () => void
  setNotificationCount: (count: number) => void
  setRailMode: (mode: RailMode) => void
}

export type AppShellStore = AppShellState & AppShellActions

// ---------------------------------------------------------------------------
// Store
//
// Context-free — no <Provider> wrapper needed anywhere.
// Any Client Component in the shell can call useAppShellStore() directly.
//
// Use this for cross-cutting shell state that multiple UI regions share:
//   • commandOpen      → command trigger (utility bar), keyboard shortcut, result list
//   • notificationCount → badge in utility bar, populated by polling / SSE
//
// Do NOT put per-route business data here — keep it in Server Components.
// ---------------------------------------------------------------------------

export const useAppShellStore = create<AppShellStore>()((set) => ({
  commandOpen: false,
  notificationCount: 0,
  railMode: "expanded",

  openCommand: () => set({ commandOpen: true }),
  closeCommand: () => set({ commandOpen: false }),
  toggleCommand: () => set((s) => ({ commandOpen: !s.commandOpen })),

  setNotificationCount: (count) => set({ notificationCount: count }),
  setRailMode: (mode) => set({ railMode: mode }),
}))
