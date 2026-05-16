"use client"

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
} from "./utility-bar.client"

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
} from "./utility-bar.client"

export {
  AppShellCommandPalette,
  AppShellUtilityBarCommandSearch,
  AppShellUtilityBarCommandSearchTrigger,
} from "./utility-bar-command.client"
export type {
  AppShellCommandPaletteItem,
  AppShellCommandPaletteProps,
  AppShellCommandPaletteSection,
  AppShellUtilityBarCommandSearchProps,
  AppShellUtilityBarCommandSearchTriggerProps,
} from "./utility-bar-command.client"

// Reusable panel wrapper
export { AppShellUtilityPanel } from "./utility-bar-panel.client"
export type { AppShellUtilityPanelProps } from "./utility-bar-panel.client"

// Marketplace panel (customization hub)
export { AppShellMarketplacePanel } from "./utility-bar-marketplace.client"

// Self-contained right-rail panels
export { UtilityBarOrgAdminPanel } from "./utility-bar-org-admin.client"
export type { UtilityBarOrgAdminPanelProps } from "./utility-bar-org-admin.client"
export { UtilityBarConnectivityPanel } from "./utility-bar-connectivity.client"
export { UtilityBarLynxPanel } from "./utility-bar-lynx.client"
export type { UtilityBarLynxPanelProps } from "./utility-bar-lynx.client"
export { UtilityBarDensityPanel } from "./utility-bar-density.client"
export { UtilityBarDiagnosisPanel } from "./utility-bar-diagnosis.client"
export { UtilityBarScreenshotPanel } from "./utility-bar-screenshot.client"
export { UtilityBarShortcutsPanel } from "./utility-bar-shortcuts.client"
export { UtilityBarFeedbackPanel } from "./utility-bar-feedback.client"
export { UtilityBarMessengerPanel } from "./utility-bar-messenger.client"
export { UtilityBarCoordinationPanel } from "./utility-bar-coordination.client"
export { UtilityBarStoragePanel } from "./utility-bar-storage.client"
export { UtilityBarUploadPanel } from "./utility-bar-upload.client"
export type { UtilityBarUploadPanelProps } from "./utility-bar-upload.client"

// Utility-bar dropdown shell (dropdown + optional sibling overlays)
export { AppShellUtilityBarIconDropdown } from "./utility-bar-icon-dropdown.client"
export type { AppShellUtilityBarIconDropdownProps } from "./utility-bar-icon-dropdown.client"

export { AppShellAccountDropdown } from "./utility-bar-account-dropdown.client"
export type { AppShellAccountDropdownProps } from "./utility-bar-account-dropdown.client"
export { buildAppShellAccountDropdownGroups } from "./utility-bar-account-dropdown.groups"
export type { AppShellAccountDropdownHrefs } from "./utility-bar-account-dropdown.groups"

// Standard utility dropdown (DropdownMenu)
export { AppShellUtilityDropdown } from "./utility-dropdown.client"
export type {
  AppShellUtilityDropdownProps,
  UtilityDropdownGroup,
  UtilityDropdownItem,
} from "./utility-dropdown.client"

// DnD-enabled right rail (replaces manual right icon composition)
export { AppShellUtilityBarRight } from "./utility-bar-right.client"
export type { AppShellUtilityBarRightProps } from "./utility-bar-right.client"
