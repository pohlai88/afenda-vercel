import { z } from "zod"

import {
  geofenceScopeKindSchema,
  remoteCheckinDeviceStateSchema,
  remoteCheckinEventTypeSchema,
  remoteCheckinExceptionDetectionOutcomeSchema,
  remoteCheckinExceptionStateSchema,
  remoteCheckinPolicyScopeSchema,
  remoteCheckinVerificationOutcomeSchema,
} from "./geolocation-workflow-state.shared"

/** Latitude/longitude regexes — match the LAM attendance event decimal columns. */
const latitudeNumber = z.coerce.number().min(-90).max(90)
const longitudeNumber = z.coerce.number().min(-180).max(180)
const radiusMeters = z.coerce.number().int().positive().max(50_000)
const gpsAccuracyMeters = z.coerce.number().int().nonnegative().max(10_000)

/**
 * Mobile / web capture payload. Validated by the Server Action before the
 * validation engine runs. Selfie blob URL must already be in Vercel Blob.
 */
export const recordRemoteCheckinFormSchema = z.object({
  eventType: remoteCheckinEventTypeSchema,
  occurredAtIso: z.string().datetime({ offset: true }),
  latitude: latitudeNumber,
  longitude: longitudeNumber,
  gpsAccuracyMeters: gpsAccuracyMeters,
  deviceId: z.string().trim().min(1).max(128),
  deviceLabel: z.string().trim().max(128).optional().nullable(),
  deviceFingerprint: z.string().trim().min(8).max(256).optional().nullable(),
  remoteLocationLabel: z.string().trim().max(256).optional().nullable(),
  geofenceId: z.string().uuid().optional().nullable(),
  selfieBlobUrl: z.string().url().startsWith("https://").optional().nullable(),
  /** Client-evaluated hints (location permission state, network IP). Logged for forensics only. */
  capturedClientIp: z.string().trim().max(64).optional().nullable(),
  spoofingSignals: z
    .array(z.string().trim().min(1).max(64))
    .max(16)
    .optional()
    .nullable(),
})

export type RecordRemoteCheckinFormInput = z.infer<
  typeof recordRemoteCheckinFormSchema
>

/**
 * Exception submission — references the in-memory event draft from the most
 * recent capture, so the approver can replay the validation outcome.
 */
export const submitRemoteCheckinExceptionFormSchema = z.object({
  eventType: remoteCheckinEventTypeSchema,
  occurredAtIso: z.string().datetime({ offset: true }),
  latitude: latitudeNumber.optional().nullable(),
  longitude: longitudeNumber.optional().nullable(),
  gpsAccuracyMeters: gpsAccuracyMeters.optional().nullable(),
  deviceId: z.string().trim().max(128).optional().nullable(),
  remoteLocationLabel: z.string().trim().max(256).optional().nullable(),
  geofenceId: z.string().uuid().optional().nullable(),
  selfieBlobUrl: z.string().url().startsWith("https://").optional().nullable(),
  detectionOutcome: remoteCheckinExceptionDetectionOutcomeSchema,
  reason: z.string().trim().min(1, "A short reason is required.").max(2_000),
})

export type SubmitRemoteCheckinExceptionFormInput = z.infer<
  typeof submitRemoteCheckinExceptionFormSchema
>

/**
 * Approve / reject / return / correct an exception.
 */
export const remoteCheckinExceptionDecisionFormSchema = z
  .object({
    exceptionId: z.string().uuid(),
    decision: z.enum(["approve", "reject", "return", "correct"]),
    decisionReason: z.string().trim().max(2_000).optional().nullable(),
    /** Required for `correct`. */
    correctedEventType: remoteCheckinEventTypeSchema.optional().nullable(),
    correctedOccurredAtIso: z
      .string()
      .datetime({ offset: true })
      .optional()
      .nullable(),
    correctedLatitude: latitudeNumber.optional().nullable(),
    correctedLongitude: longitudeNumber.optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.decision === "reject" || data.decision === "return") {
      if (!data.decisionReason || data.decisionReason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Reason is required for reject / return decisions.",
          path: ["decisionReason"],
        })
      }
    }
    if (data.decision === "correct") {
      if (!data.decisionReason || data.decisionReason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Reason is required when correcting a check-in.",
          path: ["decisionReason"],
        })
      }
      if (data.correctedLatitude == null && data.correctedLongitude == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Corrected coordinates are required for a correction.",
          path: ["correctedLatitude"],
        })
      }
    }
  })

export type RemoteCheckinExceptionDecisionFormInput = z.infer<
  typeof remoteCheckinExceptionDecisionFormSchema
>

/**
 * Geofence catalog mutations — admin only.
 */
export const upsertGeofenceFormSchema = z.object({
  geofenceId: z.string().uuid().optional().nullable(),
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(48)
    .regex(
      /^[A-Z0-9_-]+$/,
      "Use uppercase letters, numbers, dashes, and underscores."
    ),
  label: z.string().trim().min(1, "Label is required.").max(160),
  scopeKind: geofenceScopeKindSchema,
  latitude: latitudeNumber,
  longitude: longitudeNumber,
  radiusMeters: radiusMeters,
  bufferMeters: z.coerce.number().int().nonnegative().max(5_000).optional(),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional()
    .nullable(),
  legalEntityCode: z.string().trim().max(64).optional().nullable(),
  notes: z.string().trim().max(2_000).optional().nullable(),
})

export type UpsertGeofenceFormInput = z.infer<typeof upsertGeofenceFormSchema>

/**
 * Remote check-in policy mutations — admin only.
 */
export const upsertRemoteCheckinPolicyFormSchema = z.object({
  policyId: z.string().uuid().optional().nullable(),
  scopeKind: remoteCheckinPolicyScopeSchema,
  scopeRef: z.string().trim().max(160).optional().nullable(),
  minGpsAccuracyMeters: z.coerce
    .number()
    .int()
    .positive()
    .max(1_000)
    .default(100),
  allowedRadiusBufferMeters: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(2_000)
    .default(50),
  shiftWindowMinutes: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(720)
    .default(60),
  breakWindowMinutes: z.coerce
    .number()
    .int()
    .nonnegative()
    .max(360)
    .default(30),
  requireRegisteredDevice: z.coerce.boolean().default(true),
  requireSelfie: z.coerce.boolean().default(false),
  detectSpoofing: z.coerce.boolean().default(true),
  allowEligibilityException: z.coerce.boolean().default(true),
  isActive: z.coerce.boolean().default(true),
}).superRefine((data, ctx) => {
  if (data.scopeKind === "org") return
  const ref = data.scopeRef?.trim()
  if (!ref) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Scope reference is required for non-org policies.",
      path: ["scopeRef"],
    })
  }
})

export type UpsertRemoteCheckinPolicyFormInput = z.infer<
  typeof upsertRemoteCheckinPolicyFormSchema
>

/**
 * Device registration mutations — admin or self-service (gated).
 */
export const upsertRemoteCheckinDeviceFormSchema = z.object({
  deviceId: z.string().uuid().optional().nullable(),
  employeeId: z.string().uuid(),
  deviceLabel: z.string().trim().min(1).max(128),
  deviceFingerprint: z.string().trim().min(8).max(256),
  state: remoteCheckinDeviceStateSchema.optional(),
})

export type UpsertRemoteCheckinDeviceFormInput = z.infer<
  typeof upsertRemoteCheckinDeviceFormSchema
>

/**
 * Report export filters (CSV).
 */
export const exportRemoteCheckinReportFormSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    employeeId: z.string().uuid().optional().nullable(),
    departmentId: z.string().uuid().optional().nullable(),
    geofenceId: z.string().uuid().optional().nullable(),
    scopeKind: geofenceScopeKindSchema.optional().nullable(),
    onlyExceptions: z.coerce.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date.",
        path: ["endDate"],
      })
    }
  })

export type ExportRemoteCheckinReportFormInput = z.infer<
  typeof exportRemoteCheckinReportFormSchema
>

/**
 * Row shapes for the validated capture pipeline — exposed by data/queries.
 */
export const remoteCheckinExceptionRowSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  employeeId: z.string().uuid(),
  state: remoteCheckinExceptionStateSchema,
  eventType: remoteCheckinEventTypeSchema,
  occurredAt: z.date(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  gpsAccuracyMeters: z.number().int().nullable(),
  deviceId: z.string().nullable(),
  remoteLocationLabel: z.string().nullable(),
  geofenceId: z.string().uuid().nullable(),
  selfieBlobUrl: z.string().nullable(),
  detectionOutcome: remoteCheckinVerificationOutcomeSchema,
  reason: z.string(),
  decisionReason: z.string().nullable(),
  decidedAt: z.date().nullable(),
  decidedByUserId: z.string().nullable(),
  resolvedEventId: z.string().uuid().nullable(),
  createdAt: z.date(),
})

export type RemoteCheckinExceptionRow = z.infer<
  typeof remoteCheckinExceptionRowSchema
>
