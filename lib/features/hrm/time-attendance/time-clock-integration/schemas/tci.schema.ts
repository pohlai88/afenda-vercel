import { z } from "zod"

import {
  TCI_DEVICE_STATES,
  TCI_DEVICE_TYPES,
  TCI_MAPPING_STATES,
  TCI_PUNCH_EVENT_TYPES,
  TCI_SYNC_SOURCE_KINDS,
} from "./tci-workflow-state.shared"

export const upsertTimeClockDeviceFormSchema = z.object({
  id: z.string().trim().optional(),
  externalDeviceId: z.string().trim().min(1).max(120),
  name: z.string().trim().min(1).max(200),
  deviceType: z.enum(TCI_DEVICE_TYPES),
  locationRef: z.string().trim().max(200).optional().nullable(),
  state: z.enum(TCI_DEVICE_STATES).optional(),
  integrationCredentialRef: z.string().trim().max(200).optional().nullable(),
})

export const upsertTimeClockMappingFormSchema = z.object({
  id: z.string().trim().optional(),
  deviceId: z.string().trim().min(1),
  employeeId: z.string().trim().min(1),
  clockUserId: z.string().trim().min(1).max(120),
  badgeId: z.string().trim().max(120).optional().nullable(),
  biometricRef: z.string().trim().max(120).optional().nullable(),
  state: z.enum(TCI_MAPPING_STATES).optional(),
})

export const timeClockIngestPunchSchema = z.object({
  externalDeviceId: z.string().trim().min(1),
  clockUserId: z.string().trim().min(1),
  eventType: z.enum(TCI_PUNCH_EVENT_TYPES),
  occurredAtIso: z.string().datetime(),
  sourceRef: z.string().trim().max(200).optional(),
  rawPayloadHash: z.string().trim().max(128).optional(),
})

export const timeClockIngestBatchSchema = z.object({
  organizationId: z.string().trim().min(1),
  sourceKind: z.enum(TCI_SYNC_SOURCE_KINDS).default("api"),
  punches: z.array(timeClockIngestPunchSchema).min(1).max(500),
})

export const timeClockExceptionDecisionFormSchema = z.object({
  exceptionId: z.string().trim().min(1),
  decision: z.enum(["approve", "reject"]),
  decisionReason: z.string().trim().max(2000).optional(),
})

export const exportTimeClockReportFormSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    employeeId: z.string().uuid().optional().nullable(),
    deviceId: z.string().uuid().optional().nullable(),
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

export const timeClockManualImportRowSchema = z.object({
  external_device_id: z.string().trim().min(1).max(120),
  clock_user_id: z.string().trim().min(1).max(120),
  event_type: z.enum(TCI_PUNCH_EVENT_TYPES),
  occurred_at_iso: z.string().datetime(),
  source_ref: z.string().trim().max(200).optional(),
})

export type ExportTimeClockReportFormInput = z.infer<
  typeof exportTimeClockReportFormSchema
>
export type TimeClockManualImportRow = z.infer<
  typeof timeClockManualImportRowSchema
>

export type TimeClockExceptionDecisionFormInput = z.infer<
  typeof timeClockExceptionDecisionFormSchema
>

export type UpsertTimeClockDeviceFormInput = z.infer<
  typeof upsertTimeClockDeviceFormSchema
>
export type UpsertTimeClockMappingFormInput = z.infer<
  typeof upsertTimeClockMappingFormSchema
>
export type TimeClockIngestPunchInput = z.infer<typeof timeClockIngestPunchSchema>
export type TimeClockIngestBatchInput = z.infer<typeof timeClockIngestBatchSchema>
