// Shell stores barrel.
// Context-free Zustand stores — no provider needed, import and call directly.

export { useAppShellStore } from "./app-shell.store"
export type {
  AppShellState,
  AppShellStore,
  AppShellThemeSnapshot,
  RailMode,
  ResolvedAppearance,
  ThemePreference,
} from "./app-shell.store"

export { useLaneMemoryStore, LANE_MEMORY_MAX } from "./lane-memory.store"
export type {
  LaneMemoryItem,
  LaneMemoryLane,
  LaneMemoryStore,
} from "./lane-memory.store"

export {
  useUtilityBarStore,
  selectVisibleItems,
  selectAllItemsOrdered,
} from "./utility-bar.store"
export type { UtilityBarItemState, UtilityBarStore } from "./utility-bar.store"

export { useOperationalScopeUiStore } from "./operational-scope.store"
export type { OperationalScopeUiStore } from "./operational-scope.store"
