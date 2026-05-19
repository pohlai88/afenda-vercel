import "server-only"

export {
  listOrgEventEndpoints,
  getOrgEventEndpoint,
  listRecentDeliveriesForEndpoint,
  findEnabledEndpointForEventType,
  listSubscribedEventTypesForOrg,
  getOrgEventDelivery,
  listOrgEventDeliveriesByIds,
} from "./data/integrations-endpoints.queries"

export {
  listOrgImportJobs,
  getOrgImportJob,
  listJobRows,
  listJobFailures,
  countActiveImportJobsForOrganization,
} from "./data/import-jobs.queries"

export { listUserOrganizationsForSwitcher } from "./data/user-orgs.queries.server"

export { getOrgAdminRailPressureCounts } from "./data/org-admin-rail-pressure.queries.server"
export { recordOrgAdminPageVisit } from "./data/org-admin-rail-recents.server"
export { resolveOrgAdminAuditSearchParams } from "./data/org-admin-audit-search-params.server"
export { loadOrgAdminAuditListing } from "./data/org-admin-audit-listing.server"
export {
  fetchOrgAdminIdentity,
  fetchOrgAdminMembers,
  fetchOrgAdminPendingInvitations,
} from "./data/org-admin-directory.server"
export type {
  OrgAdminRecentSegment,
  OrgAdminRecentSessionContext,
} from "./data/org-admin-rail-recents.server"

export { deliverEventNow } from "./data/integrations-delivery.server"
export { getOrgEventEndpointSigningKey } from "./data/integrations-endpoints.mutations"

// Phase 3J: webhook receiver primitives — used by inbound integration routes
// (e.g. bureau acknowledgement at app/api/integrations/hrm-statutory-acknowledgement).
export {
  resolveOrgEventDeliveryForWebhook,
  verifyOrgEventWebhookSignature,
} from "./data/integrations-delivery.server"

export type {
  OrgEventWebhookResolution,
  OrgEventWebhookVerification,
} from "./data/integrations-delivery.server"

export type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
  OrgImportAdapter,
  AdapterParseOk,
  AdapterParseErr,
} from "./data/import-adapter.server"

export type { OrgEventEnvelope } from "./data/integrations-delivery.server"
