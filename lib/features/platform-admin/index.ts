// Constants & registry
export {
  PLATFORM_ADMIN_ALLOWED_SEGMENTS,
  PLATFORM_ADMIN_CAPABILITIES,
  PLATFORM_ADMIN_CAPABILITY_IDS,
  PLATFORM_ADMIN_NAV_ITEMS,
  PLATFORM_ADMIN_USERS_MAX_PAGE_SIZE,
  PLATFORM_ADMIN_USERS_PAGE_SIZE,
  PLATFORM_ADMIN_USERS_SEARCH_MAX_LENGTH,
  getPlatformAdminCapabilityById,
  isAllowedPlatformAdminSegment,
  platformAdminPath,
} from "./constants"
export type { RegisteredPlatformAdminCapability } from "./constants"

// Types
export type {
  PlatformAdminCapability,
  PlatformAdminCapabilityId,
  PlatformAdminNavItem,
  PlatformAdminNavKey,
  PlatformAdminOrganizationSummary,
  PlatformAdminUserPage,
  PlatformAdminUserSummary,
} from "./types"
export { PLATFORM_ADMIN_NAV_NAMESPACE } from "./types"

// Data (server-only)
export {
  listUsersForPlatformAdmin,
  type PlatformAdminUserListInput,
} from "./data/users.queries.server"
export { listOrganizationsForPlatformAdmin } from "./data/organizations.queries.server"

// Server Actions
export {
  banUserAction,
  setUserRoleAction,
  unbanUserAction,
  type PlatformAdminUserActionState,
} from "./actions/users.actions"

// Rail slots builder
export { buildPlatformAdminRailSlots } from "./data/platform-admin-rail-slots"

// UI components
export { PlatformAdminShell } from "./components/platform-admin-shell"
export { PlatformAdminSidebar } from "./components/platform-admin-sidebar"
export { PlatformAdminUsersSearch } from "./components/platform-admin-users-search"
export { PlatformAdminUsersTable } from "./components/platform-admin-users-table"
export { PlatformAdminOrganizationsTable } from "./components/platform-admin-organizations-table"
