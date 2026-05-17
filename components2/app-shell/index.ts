import "server-only"

// ---------------------------------------------------------------------------
// App-shell public barrel (`#app-shell`)
// ---------------------------------------------------------------------------

export { AppShell, type AppShellProps } from "./appshell"
export { AppSubLayout, type AppSubLayoutProps } from "./surface/appshell-sub-layout-rsc"
export { AppSubLayoutShellSkeleton } from "./surface/appshell-sub-layout-shell-skeleton"
export { AppShellSurface, type AppShellSurfaceProps } from "./surface/appshell-sub-layout-surface"
export { AppShellUtilityBar, type AppShellUtilityBarProps } from "./top-utils-bar/appshell-utility-bar"

export { buildAppShellOrgUtilityBarSlots } from "./compose/appshell-utility-bar-org.server"
export { buildAppShellConsoleUtilityBarSlots } from "./compose/appshell-utility-bar-console.server"

export type {
  AppShellChromeProps,
  AppShellChromePropsInput,
  AppShellUtilityBarSlots,
} from "./appshell-props.shared"

export type {
  AppShellPrimaryLeftRailConfig,
  AppShellPrimaryLeftRailSlots,
  AppShellPrimaryLeftRailSlotsData,
  AppShellPrimaryLeftRailLabels,
  AppShellPrimaryLeftRailNavSection,
  AppShellPrimaryLeftRailNavItem,
  AppShellPrimaryLeftRailNavChildItem,
  AppShellPrimaryLeftRailInbox,
  AppShellPrimaryLeftRailPin,
  AppShellPrimaryLeftRailView,
  AppShellPrimaryLeftRailRecent,
  AppShellPrimaryLeftRailIdentity,
  AppShellPrimaryLeftRailNavIconId,
  AppShellPrimaryLeftRailBadgeTone,
} from "./left-rail-bar/appshell-primary-left-rail.schema"

export {
  appShellPrimaryLeftRailSlotsDataSchema,
  appShellPrimaryLeftRailLabelsSchema,
  APP_SHELL_PRIMARY_LEFT_RAIL_NAV_ICON_IDS,
  APP_SHELL_PRIMARY_LEFT_RAIL_FORBIDDEN_LABEL_NAMESPACES,
  parseAppShellPrimaryLeftRailSlotsData,
  parseAppShellPrimaryLeftRailLabels,
  parseAppShellPrimaryLeftRailInbox,
  parseAppShellPrimaryLeftRailPin,
  parseAppShellPrimaryLeftRailView,
  parseAppShellPrimaryLeftRailRecent,
} from "./left-rail-bar/appshell-primary-left-rail.schema"

export { filterAppShellPrimaryLeftRailNavSections } from "./left-rail-bar/appshell-primary-left-rail.shared"
