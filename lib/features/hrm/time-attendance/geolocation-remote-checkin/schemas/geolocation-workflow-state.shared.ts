import { z } from "zod"

/**
 * Event types supported by Remote Check-In (HRM-GEO-003).
 * Mirrors the LAM attendance vocabulary so verified rows can land
 * directly in `hrm_attendance_event` without a translation table.
 */
export const REMOTE_CHECKIN_EVENT_TYPES = [
  "clock_in",
  "clock_out",
  "break_start",
  "break_end",
] as const

export type RemoteCheckinEventType = (typeof REMOTE_CHECKIN_EVENT_TYPES)[number]

export const remoteCheckinEventTypeSchema = z.enum(REMOTE_CHECKIN_EVENT_TYPES)

/**
 * Outcome of running the validation engine against a capture payload.
 * Stored on `hrm_attendance_event.locationVerificationOutcome` for verified
 * rows, and on `hrm_remote_checkin_exception.detectionOutcome` for failures.
 */
export const REMOTE_CHECKIN_VERIFICATION_OUTCOMES = [
  "verified",
  "outside_geofence",
  "weak_accuracy",
  "missing_gps",
  "ineligible_employee",
  "ineligible_device",
  "spoof_suspected",
  "outside_shift_window",
  "missing_selfie",
] as const

export type RemoteCheckinVerificationOutcome =
  (typeof REMOTE_CHECKIN_VERIFICATION_OUTCOMES)[number]

export const remoteCheckinVerificationOutcomeSchema = z.enum(
  REMOTE_CHECKIN_VERIFICATION_OUTCOMES
)

/**
 * Failure-only subset used when persisting an exception row. A "verified"
 * capture cannot produce an exception — it lands directly on
 * `hrm_attendance_event` — so the exception schema and persist contract
 * narrow the outcome to the failure cases.
 */
export const REMOTE_CHECKIN_EXCEPTION_DETECTION_OUTCOMES = [
  "outside_geofence",
  "weak_accuracy",
  "missing_gps",
  "ineligible_employee",
  "ineligible_device",
  "spoof_suspected",
  "outside_shift_window",
  "missing_selfie",
] as const satisfies ReadonlyArray<
  Exclude<RemoteCheckinVerificationOutcome, "verified">
>

export type RemoteCheckinExceptionDetectionOutcome =
  (typeof REMOTE_CHECKIN_EXCEPTION_DETECTION_OUTCOMES)[number]

export const remoteCheckinExceptionDetectionOutcomeSchema = z.enum(
  REMOTE_CHECKIN_EXCEPTION_DETECTION_OUTCOMES
)

/**
 * Lifecycle states for a submitted exception. Mirrors approval workflow shape
 * used elsewhere in HRM (leave / FWA) — `submitted → approved/rejected/returned/corrected`.
 */
export const REMOTE_CHECKIN_EXCEPTION_STATES = [
  "submitted",
  "approved",
  "rejected",
  "returned",
  "corrected",
  "cancelled",
] as const

export type RemoteCheckinExceptionState =
  (typeof REMOTE_CHECKIN_EXCEPTION_STATES)[number]

export const remoteCheckinExceptionStateSchema = z.enum(
  REMOTE_CHECKIN_EXCEPTION_STATES
)

/**
 * Geofence scope kinds (HRM-GEO-005). Geofences are tagged with one and may
 * additionally narrow by department / position / employment type via the
 * policy table.
 */
export const GEOFENCE_SCOPE_KINDS = [
  "office",
  "branch",
  "project_site",
  "client_site",
  "field_site",
  "home_office",
] as const

export type GeofenceScopeKind = (typeof GEOFENCE_SCOPE_KINDS)[number]

export const geofenceScopeKindSchema = z.enum(GEOFENCE_SCOPE_KINDS)

/**
 * Scope levels for a remote-checkin policy. `org` is the default;
 * more-specific scopes override less-specific ones at evaluation time.
 */
export const REMOTE_CHECKIN_POLICY_SCOPES = [
  "org",
  "department",
  "position",
  "employment_type",
  "policy_group",
  "employee",
] as const

export type RemoteCheckinPolicyScope =
  (typeof REMOTE_CHECKIN_POLICY_SCOPES)[number]

export const remoteCheckinPolicyScopeSchema = z.enum(
  REMOTE_CHECKIN_POLICY_SCOPES
)

/**
 * Device verification states. `pending` is created when a device is first seen;
 * admins move it to `active` to allow future captures. `revoked` is permanent.
 */
export const REMOTE_CHECKIN_DEVICE_STATES = [
  "pending",
  "active",
  "revoked",
] as const

export type RemoteCheckinDeviceState =
  (typeof REMOTE_CHECKIN_DEVICE_STATES)[number]

export const remoteCheckinDeviceStateSchema = z.enum(
  REMOTE_CHECKIN_DEVICE_STATES
)
