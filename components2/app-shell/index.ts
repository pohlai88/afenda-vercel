import "server-only"

// Public door for the new app-shell.
// Import via `#app-shell` — the alias is registered in package.json imports.
//
// Server Components: import AppShell, AppSubLayout directly.
// Client Components: import AppShellSurface and schema types only.
//                    Actions / path builders live in `#app-shell/client`.

export { AppShell } from "./app-shell"
export type { AppShellProps, AppShellUtilityBarSlots } from "./app-shell"

export { AppSubLayout } from "./sub-layout"
export type { AppSubLayoutProps } from "./sub-layout.client"

export { AppShellSurface } from "./surface"
export type { AppShellSurfaceProps } from "./surface"

export { AppShellUtilityBar } from "./utility-bar"

export type {
  AppShellRailConfig,
  AppShellRailSlots,
  AppShellLabels,
  AppShellRailNavSection,
  AppShellRailNavItem,
  AppShellRailNavChildItem,
  AppShellRailView,
  AppShellRailRecent,
  AppShellRailNavIconId,
  AppShellRailBadgeTone,
} from "./rail.schema"

export {
  appShellRailSlotsDataSchema,
  appShellRailLabelsSchema,
  APP_SHELL_RAIL_NAV_ICON_IDS,
} from "./rail.schema"

// ---------------------------------------------------------------------------
// Shell store — context-free Zustand store for cross-cutting shell state.
// Import in Client Components to control command palette, notification badge, etc.
// ---------------------------------------------------------------------------
export { useAppShellStore } from "../stores/app-shell.store"
export type {
  AppShellState,
  AppShellStore,
  AppShellThemeSnapshot,
  RailMode,
  ResolvedAppearance,
  ThemePreference,
} from "../stores/app-shell.store"
