"use client"

import { create } from "zustand"

import type { UiDensity } from "#lib/design-system"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Controls how the left navigation rail behaves:
 * - `expanded`  — always visible at full width
 * - `collapsed` — icon-only; never expands unless the user changes mode
 * - `hover`     — icon-only at rest, expands while the cursor is over it
 *
 * **SidebarProvider `open`:** `RailController` (`appshell.client.tsx`) calls
 * `setOpen(railMode === "expanded")` whenever `railMode` changes. The shadcn
 * sidebar still exposes **`open`** as the source of truth for **icon strip vs
 * full width** (`collapsible="icon"`): `open === false` means icon strip.
 * `SidebarRail`, ⌘/Ctrl+B, and `UtilityBarRailTrigger` can flip **`open`**
 * without changing `railMode`. **`AppSubLayoutClient`** keys its floating panel
 * on **`open === false`**, not on `railMode` alone.
 */
export type RailMode = "expanded" | "collapsed" | "hover"

/** Mirrors `next-themes` `theme` (user preference). */
export type ThemePreference = "light" | "dark" | "system"

/** Effective light/dark from `next-themes` `resolvedTheme`; `null` before hydration. */
export type ResolvedAppearance = "light" | "dark" | null

export type AppShellThemeSnapshot = {
  preference: ThemePreference
  resolved: ResolvedAppearance
}

export type AppShellState = {
  /** Whether the command palette dialog is open. */
  commandOpen: boolean
  /** Whether the quick-create chooser is open. */
  quickCreateOpen: boolean
  /** Notification badge count — updated by utility bar polling or SSE. */
  notificationCount: number
  /**
   * Preferred navigation-rail display mode.
   * `RailController` syncs this to SidebarProvider `open` on **mode** change
   * (`setOpen(railMode === "expanded")`). Sub-layout chrome reads **`open`**
   * directly for icon-strip detection — see `AppSubLayoutClient`.
   */
  railMode: RailMode
  /**
   * User-selected theme from `next-themes` — kept in sync by `AppShellThemeBridge`
   * inside `AppShellProviders` (root layout still owns the actual `ThemeProvider`).
   */
  themePreference: ThemePreference
  /** Resolved light/dark for the document — `null` until the client has mounted. */
  resolvedAppearance: ResolvedAppearance
  /**
   * ERP content density for `SidebarInset` only (`data-density` on `#app-shell-main`).
   * Utility bar, primary rail, and surface chrome are outside that subtree.
   */
  density: UiDensity
}

type AppShellActions = {
  openCommand: () => void
  closeCommand: () => void
  toggleCommand: () => void
  openQuickCreate: () => void
  closeQuickCreate: () => void
  toggleQuickCreate: () => void
  setNotificationCount: (count: number) => void
  /** Updates `railMode`; `RailController` syncs SidebarProvider `open` on next effect. */
  setRailMode: (mode: RailMode) => void
  /** Called only from `AppShellThemeBridge` — maps `useTheme()` into this store. */
  applyNextTheme: (snapshot: AppShellThemeSnapshot) => void
  setDensity: (density: UiDensity) => void
}

export type AppShellStore = AppShellState & AppShellActions

// ---------------------------------------------------------------------------
// Store
//
// Context-free — no <Provider> wrapper needed anywhere.
// Any Client Component in the shell can call useAppShellStore() directly.
//
// Use this for cross-cutting shell state that multiple UI regions share:
//   • commandOpen         → command trigger (utility bar), keyboard shortcut, result list
//   • notificationCount   → badge in utility bar, populated by polling / SSE
//   • railMode            → RailController → sidebar `open`; AppSubLayout uses `open` for float nav
//   • themePreference / resolvedAppearance → mirrored from next-themes via AppShellThemeBridge
//   • density             → `data-density` on SidebarInset (main scroll pane only)
//
// Do NOT put per-route business data here — keep it in Server Components.
// ---------------------------------------------------------------------------

export const useAppShellStore = create<AppShellStore>()((set, get) => ({
  commandOpen: false,
  quickCreateOpen: false,
  notificationCount: 0,
  railMode: "expanded",
  themePreference: "system",
  resolvedAppearance: null,
  density: "comfortable",

  openCommand: () => set({ commandOpen: true, quickCreateOpen: false }),
  closeCommand: () => set({ commandOpen: false }),
  toggleCommand: () =>
    set((s) => ({ commandOpen: !s.commandOpen, quickCreateOpen: false })),

  openQuickCreate: () => set({ quickCreateOpen: true, commandOpen: false }),
  closeQuickCreate: () => set({ quickCreateOpen: false }),
  toggleQuickCreate: () =>
    set((s) => ({ quickCreateOpen: !s.quickCreateOpen, commandOpen: false })),

  setNotificationCount: (count) => set({ notificationCount: count }),
  setRailMode: (mode) => set({ railMode: mode }),
  setDensity: (density) => set({ density }),

  applyNextTheme: (snapshot) => {
    const s = get()
    if (
      s.themePreference === snapshot.preference &&
      s.resolvedAppearance === snapshot.resolved
    ) {
      return
    }
    set({
      themePreference: snapshot.preference,
      resolvedAppearance: snapshot.resolved,
    })
  },
}))
