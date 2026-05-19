import {
  buildCrudSapAuditAction,
  buildErpAuditAction,
} from "#lib/erp/crud-sap.shared"

/**
 * Canonical audit action strings for Geolocation & Remote Check-In.
 *
 * Import `HRM_GEOLOCATION_AUDIT` — do not hard-code `erp.hrm.remote_checkin.*`
 * or `erp.hrm.geofence.*` strings in actions or aggregators.
 *
 * Mapping to HRM-GEO-NNN requirement codes lives in
 * `geolocation-spec-map.shared.ts`.
 */
export const HRM_GEOLOCATION_AUDIT = {
  /** Approved mobile/web capture persisted directly into `hrm_attendance_event`. */
  checkinCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin",
    verb: "create",
  }),
  /** Read-only enumeration (history list, KPI source). */
  checkinSearch: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin",
    verb: "search",
  }),
  /** Detailed coordinate / device view (audit-grade). */
  checkinAudit: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin",
    verb: "audit",
  }),
  /** Employee submits a failed capture for manager/HR review. */
  exceptionSubmit: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin.exception",
    verb: "submit",
  }),
  /** Approver approves an exception → write attendance event. */
  exceptionApprove: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin.exception",
    verb: "approve",
  }),
  /** Approver rejects with reason. */
  exceptionReject: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin.exception",
    verb: "reject",
  }),
  /** Approver returns to employee for clarification. */
  exceptionReturn: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin.exception",
    verb: "return",
  }),
  /** Approver corrects coordinates / event type then approves. */
  exceptionCorrect: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin.exception",
    verb: "correct",
  }),
  /** Device registered for an employee (allows future captures). */
  deviceRegister: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin.device",
    verb: "register",
  }),
  /** Device revoked (security event). */
  deviceRevoke: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin.device",
    verb: "revoke",
  }),
  /** Geofence definition created. */
  geofenceCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "geofence",
    verb: "create",
  }),
  /** Geofence definition updated (move, rename, rescope). */
  geofenceUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "geofence",
    verb: "update",
  }),
  /** Geofence definition deactivated. */
  geofenceDeprecate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "geofence",
    verb: "deprecate",
  }),
  /** Remote check-in policy created (per-scope). */
  policyCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin_policy",
    verb: "create",
  }),
  /** Remote check-in policy updated. */
  policyUpdate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin_policy",
    verb: "update",
  }),
  /** Remote check-in policy deactivated. */
  policyDeprecate: buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin_policy",
    verb: "deprecate",
  }),
  /** Operational report export (CSV). */
  reportExport: buildErpAuditAction({
    area: "erp",
    module: "hrm",
    object: "remote_checkin_report",
    verb: "audit",
  }),
} as const

/**
 * Subject kind for the remote check-in exception approval workflow.
 */
export const REMOTE_CHECKIN_EXCEPTION_SUBJECT_KIND =
  "remote_checkin_exception" as const

export type HrmGeolocationAuditAction =
  (typeof HRM_GEOLOCATION_AUDIT)[keyof typeof HRM_GEOLOCATION_AUDIT]
