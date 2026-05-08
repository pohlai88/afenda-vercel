import "server-only"

/**
 * Neon Auth UI slice (`(auth)` / `(iam)`) server barrel.
 *
 * **Canonical implementations** live under `#lib/auth/*`; this module adds only V2 UX
 * primitives (`tenant`, flat-route interruptions, webhook verification) that compose them.
 */
export { auth } from "./server"
export {
  requireGlobalAdminSession,
  requireOrgSession,
  requireSignedInSession,
} from "./tenant.server"
export { verifyNeonAuthWebhookSignature } from "./webhook-verify.server"

export {
  normalizeAuthClientError,
  AUTH_CLIENT_ERROR_CODE,
} from "#lib/auth/auth-client-error.shared"
export type {
  AuthClientErrorCode,
  AuthClientErrorHint,
  NormalizedAuthClientError,
} from "#lib/auth/auth-client-error.shared"

export {
  canActInOrganization,
  getOrgMemberRole,
  isGlobalAdminUser,
  orgRoleAtLeast,
  orgRoleRank,
} from "#lib/auth/permission.server"
export type { OrgRoleMinimum } from "#lib/auth/permission.server"

export {
  AUTH_CONTEXT_QUERY_KEY,
  AUTH_STATUS,
  AUTH_STATUS_QUERY_KEY,
  AUTH_SUPPORT_REF_QUERY_KEY,
  authStatusCodeSchema,
  parseAuthStatusParam,
  pickFirstParam,
  sanitizeAuthContext,
} from "#lib/auth/auth-status.shared"
export type { AuthStatusCode } from "#lib/auth/auth-status.shared"
export { authInterruptionHref } from "#lib/auth/auth-interruption-url.shared"
export {
  resolveAuthInterruptionMetaTitle,
  resolveAuthStatusContent,
  type AuthResultVariant,
  type AuthStatusResolvedContent,
} from "#lib/auth/auth-status-copy"
export {
  inferAuthMethodFromPath,
  resolveIamSessionLifecycleAudit,
  writeIamAuditEvent,
  writeIamAuditEventFromHeaders,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth/audit.server"
export type { WriteIamAuditEventInput } from "#lib/auth/audit.server"
export {
  IAM_AUDIT_TELEMETRY_TAG,
  resolveIamAuditTelemetryEnabled,
} from "#lib/auth/iam-audit-telemetry.shared"
export {
  AUTH_SESSION_FRESH_AGE_SECONDS,
  isSessionFresh,
} from "#lib/auth/session-policy.server"
export { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"

export {
  authInterruptionHrefV2,
  type AuthInterruptionHrefV2Options,
} from "./interruption-url.shared"
export { redirectToAuthInterruptionV2 } from "./interruption-redirect.server"
export { requireVerifiedEmailForAccount } from "./policy.server"
export { requireRecentAuthStepUp } from "./stepup.server"
export {
  assertInvitationForUser,
  type InvitationGuardErr,
  type InvitationGuardOk,
  type InvitationGuardResult,
} from "#lib/auth/invitation-guard.server"
export {
  getEnabledSocialProviderIds,
  hasCredentialAccount,
  listSafeLinkedAccounts,
} from "#lib/auth/accounts.server"
export type { SafeLinkedAccount } from "#lib/auth/accounts.types.shared"
export {
  listDeviceSessions,
  listUserPasskeys,
  type ListedUserPasskey,
} from "#lib/auth/security.server"
export {
  listUserSecurityActivity,
  type UserSecurityActivityRow,
} from "#lib/auth/activity.server"
export { assertOrgInviteRateAllowed } from "#lib/auth/org-invite-rate.server"
export {
  fetchOrgWorkbenchIdentity,
  fetchOrgWorkbenchMembers,
  fetchOrgWorkbenchPendingInvitations,
} from "#lib/auth/org-workbench.server"
export type {
  OrgWorkbenchInvitationRow,
  OrgWorkbenchMemberRow,
} from "#lib/auth/org-workbench.server"
export {
  ORG_AUDIT_EXPORT_MAX_ROWS,
  ORG_AUDIT_STREAM_MAX_ROWS,
  buildOrganizationIamAuditCsv,
  computeOrganizationIamAuditExportSignature,
  escapeCsvCell,
  formatOrganizationIamAuditCsvDataRow,
  listOrganizationIamAuditEvents,
  listOrganizationIamAuditEventsForExport,
  organizationIamAuditExportReadableStream,
  parseCsvFirstField,
  verifyOrganizationIamAuditExportCsv,
} from "#lib/auth/org-audit.server"
export type {
  OrganizationIamAuditCsvVerification,
  OrganizationIamAuditExportRow,
  OrganizationIamAuditRow,
} from "#lib/auth/org-audit.server"
export {
  AFENDA_PATHNAME_HEADER,
  AFENDA_SEARCH_HEADER,
} from "#lib/auth/forwarded-path-headers.shared"
export { getIntendedReturnPathFromRequest } from "#lib/auth/intended-path.server"
