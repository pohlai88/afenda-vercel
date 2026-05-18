import { z } from "zod"

import {
  hrmFwaArrangementKindSchema,
  hrmFwaInitiatedBySchema,
  hrmFwaRequestStateSchema,
  hrmFwaWorkModeSchema,
} from "./fwa-workflow-state.shared"

export const fwaArrangementTypeSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  code: z.string().min(1),
  label: z.string().min(1),
  arrangementKind: hrmFwaArrangementKindSchema,
  description: z.string().nullable(),
  requiresRemoteLocation: z.boolean(),
  requiresSupportingDocument: z.boolean(),
  archivedAt: z.date().nullable(),
})

export type FwaArrangementTypeRow = z.infer<typeof fwaArrangementTypeSchema>

export const fwaSchedulePatternRowSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  workMode: hrmFwaWorkModeSchema,
  coreStart: z.string().nullable().optional(),
  coreEnd: z.string().nullable().optional(),
  flexibleStart: z.string().nullable().optional(),
  flexibleEnd: z.string().nullable().optional(),
  expectedMinutes: z.number().int().positive().nullable().optional(),
})

export type FwaSchedulePatternInput = z.infer<
  typeof fwaSchedulePatternRowSchema
>

export const fwaRequestRowSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string(),
  employeeId: z.string().uuid(),
  arrangementTypeId: z.string().uuid(),
  requestedAt: z.date(),
  reason: z.string().nullable(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  reviewDate: z.string().nullable(),
  remoteLocation: z.string().nullable(),
  evidenceDocumentId: z.string().nullable(),
  expectedWeeklyMinutes: z.number().int().positive().nullable(),
  initiatedBy: hrmFwaInitiatedBySchema,
  state: hrmFwaRequestStateSchema,
  currentApprovalId: z.string().uuid().nullable(),
  approvedByUserId: z.string().nullable(),
  approvedAt: z.date().nullable(),
  rejectedReason: z.string().nullable(),
})

export type FwaRequestRow = z.infer<typeof fwaRequestRowSchema>

export const submitFwaRequestFormSchema = z
  .object({
    employeeId: z.string().uuid(),
    arrangementTypeId: z.string().uuid(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
    reason: z.string().trim().min(1, "Reason is required."),
    remoteLocation: z.string().trim().optional().nullable(),
    evidenceDocumentId: z.string().uuid().optional().nullable(),
    expectedWeeklyHours: z.coerce.number().positive().optional(),
    reviewDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after start date.",
        path: ["endDate"],
      })
    }
  })

export const fwaApprovalDecisionSchema = z.object({
  requestId: z.string().uuid(),
  decisionNote: z.string().trim().optional().nullable(),
})

export const fwaRejectDecisionSchema = z.object({
  requestId: z.string().uuid(),
  rejectedReason: z.string().trim().min(1, "Rejection reason is required."),
})

export const fwaReturnDecisionSchema = z.object({
  requestId: z.string().uuid(),
  returnedReason: z.string().trim().min(1, "Return reason is required."),
  decisionNote: z.string().trim().optional().nullable(),
})

export const createFwaArrangementTypeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(32)
    .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, and underscores."),
  label: z.string().trim().min(1, "Label is required.").max(120),
  arrangementKind: hrmFwaArrangementKindSchema,
  description: z.string().trim().optional().nullable(),
  requiresRemoteLocation: z.coerce.boolean().optional(),
  requiresSupportingDocument: z.coerce.boolean().optional(),
})

export const seedFwaTypesFormSchema = z.object({})
