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
  platformPath,
} from "./constants"
export type { RegisteredPlatformAdminCapability } from "./constants"

// Types
export type {
  PlatformAdminCapability,
  PlatformAdminCapabilityId,
  PlatformAdminNavItem,
  PlatformAdminNavKey,
  PlatformAdminOrganizationSummary,
  PlatformAdminRailPressureBadge,
  PlatformAdminRailPressureMap,
  PlatformAdminRailPressureTone,
  PlatformAdminUserPage,
  PlatformAdminUserSummary,
} from "./types"
export { PLATFORM_ADMIN_NAV_NAMESPACE } from "./types"

// URL state (nuqs) — org-scoped operator user directory
export {
  loadPlatformOperatorUsersSearchParams,
  sanitizePlatformOperatorUsersSearchParams,
  serializePlatformOperatorUsersSearchParams,
  type PlatformOperatorUsersSearchParamsLoaded,
} from "./schemas/platform-operator-users.search-params"

// Data (server-only)
export {
  listUsersForPlatformAdmin,
  type PlatformAdminUserListInput,
} from "./data/users.queries.server"
export { listOrganizationsForPlatformAdmin } from "./data/organizations.queries.server"

// Phase 2 — Working Memory Rail pressure. Server-only query wrapped in
// `React.cache` so the layout (`app/[locale]/platform/layout.tsx`) and
// any future RSC consumers share a single round trip per request.
export { getPlatformAdminRailPressureCounts } from "./data/platform-admin-rail-pressure.queries.server"

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
export { PlatformAdminUsersSearch } from "./components/platform-admin-users-search"
export { PlatformAdminUsersListSection } from "./components/platform-admin-users-list-section"
export { PlatformAdminOrganizationsListSection } from "./components/platform-admin-organizations-list-section"
