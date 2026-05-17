"use client"

// ---------------------------------------------------------------------------
// App-shell entry contract — client barrel (`#app-shell/client`)
// ---------------------------------------------------------------------------
//
// Resolution: `package.json` → `"#app-shell/client"` → this file.
//
// IMPORT RULES
// • Prefer `#app-shell/client` over `#components2/app-shell/client` or any path under
//   `components2/app-shell/**` from outside this folder — keeps refactors grep-clean.
// • Never import `#app-shell` from Client Components (`server-only`).
//
// Server layouts compose `{ utilityBar, rail, … }` via `#app-shell` (`AppShell`) and pass serializable
// props / React nodes into the client chrome.

export { AppShellSurface } from "./surface/appshell-sub-layout-surface"
export type { AppShellSurfaceProps } from "./surface/appshell-sub-layout-surface"

export type {
  AppShellChromeProps,
  AppShellChromePropsInput,
  AppShellUtilityBarSlots,
} from "./appshell-props.shared"

export { useAppShellStore } from "../stores/app-shell.store"
export type {
  AppShellState,
  AppShellStore,
  AppShellThemeSnapshot,
  RailMode,
  ResolvedAppearance,
  ThemePreference,
} from "../stores/app-shell.store"

export {
  APP_SHELL_UTILITY_DISC_CLASS,
  APP_SHELL_UTILITY_L2_ICON_CLASS,
  AppShellAvatarDisc,
  AppShellAppsDisc,
  AppShellBrandDisc,
  AppShellPolicyDisc,
  AppShellUtilityBarLeftIcons,
  AppShellUtilityBarRightIcons,
  // L2 icon primitives
  AppShellIconButton,
  AppShellIconLink,
  // Named right-rail icon presets
  AppShellHelpIcon,
  AppShellInsightIcon,
  AppShellSettingsIcon,
  AppShellQuickCreateIcon,
  AppShellSearchMobileIcon,
  AppShellNotificationsIcon,
  AppShellShortcutsIcon,
  AppShellThemeIcon,
  AppShellDensityIcon,
  AppShellLocaleDropdown,
  AppShellLocaleIcon,
  AppShellFeedbackIcon,
  AppShellMessengerIcon,
  AppShellConnectivityIcon,
  AppShellStorageIcon,
  AppShellScreenshotIcon,
  AppShellUploadIcon,
  AppShellDiagnosisIcon,
} from "./top-utils-bar/appshell-utility-bar.client"

export type {
  AppShellAvatarDiscProps,
  AppShellAppsDiscProps,
  AppShellBrandDiscProps,
  AppShellPolicyDiscProps,
  AppShellUtilityBarLeftIconsProps,
  AppShellUtilityBarRightIconsProps,
  // L2 icon primitive types
  AppShellIconButtonProps,
  AppShellIconLinkProps,
} from "./top-utils-bar/appshell-utility-bar.client"

export {
  AppShellCommandPalette,
  AppShellUtilityBarCommandSearch,
  AppShellUtilityBarCommandSearchTrigger,
} from "./top-utils-bar/appshell-utility-bar-command.client"
export type {
  AppShellCommandPaletteItem,
  AppShellCommandPaletteProps,
  AppShellCommandPaletteSection,
  AppShellUtilityBarCommandSearchProps,
  AppShellUtilityBarCommandSearchTriggerProps,
} from "./top-utils-bar/appshell-utility-bar-command.client"

// Reusable panel wrapper
export { AppShellUtilityPanel } from "./top-utils-bar/appshell-utility-bar-panel.client"
export type { AppShellUtilityPanelProps } from "./top-utils-bar/appshell-utility-bar-panel.client"

// Marketplace panel (customization hub)
export { AppShellMarketplacePanel } from "./top-utils-bar/appshell-utility-bar-marketplace.client"

// Self-contained right-rail panels
export { UtilityBarOrgAdminPanel } from "./top-utils-bar/appshell-utility-bar-org-admin.client"
export type { UtilityBarOrgAdminPanelProps } from "./top-utils-bar/appshell-utility-bar-org-admin.client"
export { UtilityBarConnectivityPanel } from "./top-utils-bar/appshell-utility-bar-connectivity.client"
export { UtilityBarLynxPanel } from "./top-utils-bar/appshell-utility-bar-lynx.client"
export type { UtilityBarLynxPanelProps } from "./top-utils-bar/appshell-utility-bar-lynx.client"
export { UtilityBarDensityPanel } from "./top-utils-bar/appshell-utility-bar-density.client"
export { UtilityBarDiagnosisPanel } from "./top-utils-bar/appshell-utility-bar-diagnosis.client"
export { UtilityBarScreenshotPanel } from "./top-utils-bar/appshell-utility-bar-screenshot.client"
export { UtilityBarShortcutsPanel } from "./top-utils-bar/appshell-utility-bar-shortcuts.client"
export { UtilityBarFeedbackPanel } from "./top-utils-bar/appshell-utility-bar-feedback.client"
export { UtilityBarMessengerPanel } from "./top-utils-bar/appshell-utility-bar-messenger.client"
export { UtilityBarCoordinationPanel } from "./top-utils-bar/appshell-utility-bar-coordination.client"
export { UtilityBarStoragePanel } from "./top-utils-bar/appshell-utility-bar-storage.client"
export { UtilityBarUploadPanel } from "./top-utils-bar/appshell-utility-bar-upload.client"
export type { UtilityBarUploadPanelProps } from "./top-utils-bar/appshell-utility-bar-upload.client"

// Utility-bar dropdown shell (dropdown + optional sibling overlays)
export { AppShellUtilityBarIconDropdown } from "./top-utils-bar/appshell-utility-bar-icon-dropdown.client"
export type { AppShellUtilityBarIconDropdownProps } from "./top-utils-bar/appshell-utility-bar-icon-dropdown.client"

export { AppShellAccountDropdown } from "./top-utils-bar/appshell-utility-bar-account-dropdown.client"
export type { AppShellAccountDropdownProps } from "./top-utils-bar/appshell-utility-bar-account-dropdown.client"
export { buildAppShellAccountDropdownGroups } from "./top-utils-bar/appshell-utility-bar-account-dropdown.groups"
export type { AppShellAccountDropdownHrefs } from "./top-utils-bar/appshell-utility-bar-account-dropdown.groups"

// Standard utility dropdown (DropdownMenu)
export { AppShellUtilityDropdown } from "./top-utils-bar/appshell-utility-bar-dropdown.client"
export type {
  AppShellUtilityDropdownProps,
  UtilityDropdownGroup,
  UtilityDropdownItem,
} from "./top-utils-bar/appshell-utility-bar-dropdown.client"

// DnD-enabled right rail (replaces manual right icon composition)
export { AppShellUtilityBarRight } from "./top-utils-bar/appshell-utility-bar-right.client"
export type { AppShellUtilityBarRightProps } from "./top-utils-bar/appshell-utility-bar-right.client"

export {
  CrudSapActionBar,
  CrudSapIconButton,
} from "./crud-sap/appshell-crud-sap-action-bar.client"
export {
  CRUD_SAP_ORDER_STORAGE_KEY,
  CRUD_SAP_VERB_IDS,
  type CrudSapVerbId,
} from "./crud-sap/appshell-crud-sap.schema"

export { AppShellPrimaryLeftRailFooter } from "./left-rail-bar/appshell-primary-left-rail-footer.client"
export type { AppShellPrimaryLeftRailFooterProps } from "./left-rail-bar/appshell-primary-left-rail-footer.client"

export { AppShellOrgCompanySwitch } from "./top-utils-bar/appshell-org-company-switch.client"
export { AppShellAppLauncher } from "./top-utils-bar/appshell-app-launcher"
export { AppShellAppLauncherTrigger } from "./top-utils-bar/appshell-app-launcher-trigger"
export type { AppShellAppLauncherTriggerProps } from "./top-utils-bar/appshell-app-launcher-trigger"
export { AppShellUtilityControlAvatarTrigger } from "./top-utils-bar/appshell-utility-control-avatar-trigger.client"
export type { AppShellUtilityControlAvatarTriggerProps } from "./top-utils-bar/appshell-utility-control-avatar-trigger.client"
export { AppShellNexusUtilityScreenshot } from "./top-utils-bar/appshell-nexus-utility-screenshot.client"
export { AppShellNexusUtilityUpload, buildAppShellNexusUtilityUploadPath, formatFileSize } from "./top-utils-bar/appshell-nexus-utility-upload.client"
export { AppShellNexusUtilityNotifications } from "./top-utils-bar/appshell-nexus-utility-notifications.client"
