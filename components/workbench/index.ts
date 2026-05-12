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
export {
  WorkbenchRail,
  isWorkbenchRailNavItemActive,
  WORKBENCH_RAIL_ACTIVE_MATCH_KEYS,
  WORKBENCH_RAIL_BADGE_TONE_KEYS,
  WORKBENCH_RAIL_FORBIDDEN_LABEL_NAMESPACES,
  WORKBENCH_RAIL_NAV_ICON_IDS,
  parseWorkbenchRailInbox,
  parseWorkbenchRailLabels,
  parseWorkbenchRailNavItem,
  parseWorkbenchRailPin,
  parseWorkbenchRailRecent,
  parseWorkbenchRailSlotsData,
  parseWorkbenchRailView,
  workbenchRailActiveMatchSchema,
  workbenchRailBadgeToneSchema,
  workbenchRailIdentitySchema,
  workbenchRailInboxSchema,
  workbenchRailLabelsSchema,
  workbenchRailNavBadgeSchema,
  workbenchRailNavIconIdSchema,
  workbenchRailNavItemSchema,
  workbenchRailNavSectionSchema,
  workbenchRailPinSchema,
  workbenchRailRecentSchema,
  workbenchRailSlotsDataSchema,
  workbenchRailViewSchema,
} from "./rail"
export type {
  WorkbenchRailActiveMatch,
  WorkbenchRailBadgeTone,
  WorkbenchRailIdentity,
  WorkbenchRailInbox,
  WorkbenchRailLabels,
  WorkbenchRailNavBadge,
  WorkbenchRailNavIconId,
  WorkbenchRailNavItem,
  WorkbenchRailNavSection,
  WorkbenchRailPin,
  WorkbenchRailProps,
  WorkbenchRailRecent,
  WorkbenchRailSlots,
  WorkbenchRailView,
} from "./rail"

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
