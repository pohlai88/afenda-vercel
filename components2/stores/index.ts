// Shell stores barrel — context-free Zustand; import via `#components2/stores`.

export { useAppShellStore } from "./app-shell.store"
export type {
  AppShellState,
  AppShellStore,
  AppShellThemeSnapshot,
  RailMode,
  ResolvedAppearance,
  ThemePreference,
} from "./app-shell.store"

export {
  useLaneMemoryStore,
  LANE_MEMORY_MAX,
  LANE_MEMORY_LANES,
  LANE_MEMORY_LABELS,
} from "./lane-memory.store"
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

export {
  UTILITY_BAR_CATALOG,
  UTILITY_BAR_MAX_VISIBLE,
} from "./utility-bar-catalog.shared"
export type {
  UtilityBarItemDef,
  UtilityBarItemId,
  UtilityBarSection,
} from "./utility-bar-catalog.shared"

export { useOperationalScopeUiStore } from "./operational-scope.store"
export type { OperationalScopeUiStore } from "./operational-scope.store"
