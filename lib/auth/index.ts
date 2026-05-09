import "server-only"

export {
  AUTH_CONTEXT_QUERY_KEY,
  AUTH_STATUS,
  AUTH_STATUS_QUERY_KEY,
  AUTH_SUPPORT_REF_QUERY_KEY,
  authStatusCodeSchema,
  parseAuthStatusParam,
  pickFirstParam,
  sanitizeAuthContext,
} from "./auth-status.shared"
export type { AuthStatusCode } from "./auth-status.shared"
export {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
} from "./auth-client-error.shared"
export type {
  AuthClientErrorCode,
  AuthClientErrorHint,
  NormalizedAuthClientError,
} from "./auth-client-error.shared"
export {
  resolveAuthInterruptionMetaTitle,
  resolveAuthStatusContent,
  type AuthResultVariant,
  type AuthStatusResolvedContent,
} from "./auth-status-copy"
export { auth } from "./neon.server"
export {
  AUDIT_ACTOR_MODE,
  AUDIT_ORIGIN,
  resolveAuditActorModeForInsert,
} from "./audit-origin.shared"
export type { AuditActorMode, AuditOrigin } from "./audit-origin.shared"
export {
  inferAuthMethodFromPath,
  resolveIamSessionLifecycleAudit,
  writeIamAuditEvent,
  writeIamAuditEventFromHeaders,
  writeIamAuditEventFromNextHeaders,
} from "./audit.server"
export type { WriteIamAuditEventInput } from "./audit.server"
export {
  IAM_AUDIT_TELEMETRY_TAG,
  resolveIamAuditTelemetryEnabled,
} from "./iam-audit-telemetry.shared"
export {
  AUTH_SESSION_FRESH_AGE_SECONDS,
  isSessionFresh,
} from "./session-policy.server"
export { requireRecentAuthStepUp } from "./stepup.server"
export { requireVerifiedEmailForAccount } from "./policy.server"
export { listDeviceSessions, listUserPasskeys } from "./security.server"
export { getEnabledSocialProviderIds } from "./social-providers-env.shared"
export { hasCredentialAccount, listSafeLinkedAccounts } from "./accounts.server"
export type { SafeLinkedAccount } from "./accounts.types.shared"
export { listUserSecurityActivity } from "./activity.server"
export type { UserSecurityActivityRow } from "./activity.server"
export {
  canActInOrganization,
  getOrgMemberRole,
  isGlobalAdminUser,
  orgRoleAtLeast,
  orgRoleRank,
} from "./permission.server"
export type { OrgRoleMinimum } from "./permission.server"
export { assertInvitationForUser } from "./invitation-guard.server"
export type { InvitationGuardResult } from "./invitation-guard.server"
export {
  ORG_AUDIT_CSV_HEADER_COLUMNS,
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
  parseOrganizationIamAuditOriginFilterParam,
  verifyOrganizationIamAuditExportCsv,
} from "./org-audit.server"
export type {
  OrganizationIamAuditCsvVerification,
  OrganizationIamAuditExportRow,
  OrganizationIamAuditOriginFilter,
  OrganizationIamAuditRow,
} from "./org-audit.server"
export { assertOrgInviteRateAllowed } from "./org-invite-rate.server"
export {
  fetchOrgWorkbenchIdentity,
  fetchOrgWorkbenchMembers,
  fetchOrgWorkbenchPendingInvitations,
} from "./org-workbench.server"
export type {
  OrgWorkbenchInvitationRow,
  OrgWorkbenchMemberRow,
} from "./org-workbench.server"
export {
  AFENDA_PATHNAME_HEADER,
  AFENDA_SEARCH_HEADER,
} from "./forwarded-path-headers.shared"
export { getIntendedReturnPathFromRequest } from "./intended-path.server"
export { authInterruptionHref } from "./auth-interruption-url.shared"
export { redirectToAuthInterruption } from "./interruption-redirect.server"
export { verifyNeonAuthWebhookSignature } from "./webhook-verify.server"
export {
  requireAuthShellGlobalAdminSession,
  requireAuthShellOrgSession,
  requireAuthShellSignedInSession,
} from "./auth-shell-session.server"
export type {
  AuthShellOrgSession,
  AuthShellSignedInSession,
} from "./auth-shell-session.server"
