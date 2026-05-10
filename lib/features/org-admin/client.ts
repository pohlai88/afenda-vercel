/**
 * Client-safe org-admin surface: types + Server Actions + pure constants only.
 * Dashboard shell and console bootstrap client islands import here — not `index.ts`
 * — so Turbopack never bundles `server-only` admin panels with client chunks.
 */
export type { UserOrgSummary } from "./types"
export type { PrepareOrgSlugState } from "./actions/organization-slug.actions"
export { switchActiveOrgAction } from "./actions/org-switch.actions"
export { organizationAdminPath } from "./constants"
