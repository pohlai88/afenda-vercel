// Canonical post-login shell
export { WorkbenchShell } from "./workbench-shell"
export type { WorkbenchShellProps } from "./workbench-shell.types"

// Surface content area
export { WorkbenchSurface } from "./workbench-surface"
export type { WorkbenchSurfaceProps } from "./workbench-surface"

// Utility bar
export { WorkbenchUtilityBar } from "./utility-bar/workbench-utility-bar"
export type { WorkbenchUtilityBarProps } from "./utility-bar/workbench-utility-bar"

// Rail
export { WorkbenchRail } from "./rail/workbench-rail"
export type {
  WorkbenchRailSlots,
  WorkbenchRailLabels,
  WorkbenchRailNavSection,
  WorkbenchRailNavItem,
  WorkbenchRailIdentity,
  WorkbenchRailContextStrip,
  WorkbenchRailProps,
} from "./rail/workbench-rail.types"

// Command layer + context
export { WorkbenchCommandLayer } from "./workbench-command-layer"
export type {
  WorkbenchCommandLayerProps,
  WorkbenchCommandSection,
  WorkbenchCommandItem,
} from "./workbench-command-layer"
export {
  WorkbenchCommandProvider,
  useWorkbenchCommand,
} from "./workbench-command-context"

// Mobile rail
export {
  WorkbenchMobileRailProvider,
  WorkbenchMobileRailTrigger,
  WorkbenchMobileRailSheet,
  useMobileRail,
} from "./workbench-mobile-rail"

// Sub-layout for nested rail surfaces (org admin, HRM, etc.)
export { WorkbenchSubLayout } from "./workbench-sub-layout"
export type { WorkbenchSubLayoutProps } from "./workbench-sub-layout"

// Primitives
export { WorkbenchSkipToMain } from "./workbench-skip-to-main"
export { WorkbenchDock } from "./workbench-dock"
export { WorkbenchGlobalShortcuts } from "./workbench-global-shortcuts.client"
