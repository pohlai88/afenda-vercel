import { z } from "zod"

import { computeOvertimeDurationMinutes } from "../data/otm-display.shared"

export {
  HRM_OTM_DAY_CATEGORIES,
  HRM_OTM_INITIATED_BY,
  HRM_OTM_REQUEST_STATES,
  HRM_OTM_TIMING_KINDS,
  hrmOtmDayCategorySchema,
  hrmOtmInitiatedBySchema,
  hrmOtmRequestStateSchema,
  hrmOtmTimingKindSchema,
  type HrmOtmDayCategory,
  type HrmOtmInitiatedBy,
  type HrmOtmRequestState,
  type HrmOtmTimingKind,
} from "./otm-workflow-state.shared"

import {
  hrmOtmDayCategorySchema,
  hrmOtmRoundingModeSchema,
  hrmOtmTimingKindSchema,
} from "./otm-workflow-state.shared"

const TIME_PATTERN = /^(\d{2}):(\d{2})$/

export const submitOtmRequestFormSchema = z
  .object({
    employeeId: z.string().uuid(),
    overtimeTypeId: z.string().uuid().optional().nullable(),
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(TIME_PATTERN, "Use HH:MM format."),
    endTime: z.string().regex(TIME_PATTERN, "Use HH:MM format."),
    timingKind: hrmOtmTimingKindSchema.default("actual"),
    dayCategory: hrmOtmDayCategorySchema.optional(),
    reason: z.string().trim().min(1, "Reason is required."),
    eligibilityExceptionReason: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const duration = computeOvertimeDurationMinutes(data.startTime, data.endTime)
    if (duration === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time (same-day or overnight).",
        path: ["endTime"],
      })
    }
  })

export const OTM_BULK_APPROVE_MAX = 25

export const otmApprovalDecisionSchema = z.object({
  requestId: z.string().uuid(),
  decisionNote: z.string().trim().optional().nullable(),
})

export const bulkApproveOtmRequestsFormSchema = z.object({
  requestIds: z
    .array(z.string().uuid())
    .min(1, "Select at least one request.")
    .max(
      OTM_BULK_APPROVE_MAX,
      `You can approve at most ${OTM_BULK_APPROVE_MAX} requests at once.`
    ),
  decisionNote: z.string().trim().optional().nullable(),
})

export const otmRejectDecisionSchema = z.object({
  requestId: z.string().uuid(),
  rejectedReason: z
    .string()
    .trim()
    .min(1, "Rejection reason is required."),
})

export const otmReturnDecisionSchema = z.object({
  requestId: z.string().uuid(),
  returnedReason: z
    .string()
    .trim()
    .min(1, "Return reason is required."),
  decisionNote: z.string().trim().optional().nullable(),
})

export const otmAdjustDecisionSchema = z
  .object({
    requestId: z.string().uuid(),
    workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(TIME_PATTERN, "Use HH:MM format."),
    endTime: z.string().regex(TIME_PATTERN, "Use HH:MM format."),
    adjustmentReason: z
      .string()
      .trim()
      .min(1, "Adjustment reason is required."),
    decisionNote: z.string().trim().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const duration = computeOvertimeDurationMinutes(data.startTime, data.endTime)
    if (duration === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time (same-day or overnight).",
        path: ["endTime"],
      })
    }
  })

export const otmCancelRequestSchema = z.object({
  requestId: z.string().uuid(),
  cancelReason: z.string().trim().optional().nullable(),
})

export const otmSubmitDraftSchema = z.object({
  requestId: z.string().uuid(),
})

export const createOtmTypeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required.")
    .max(32)
    .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, and underscores."),
  label: z.string().trim().min(1, "Label is required.").max(120),
  dayCategory: hrmOtmDayCategorySchema,
  description: z.string().trim().optional().nullable(),
})

import {
  HRM_OTM_APPROVER_KINDS,
  hrmOtmApproverKindSchema,
} from "./otm-approval-route.shared"

const optionalAmountCents = z
  .union([z.coerce.number().int().min(0), z.literal("")])
  .transform((value) => (value === "" ? null : value))

export const createOtmApprovalRouteFormSchema = z
  .object({
    label: z.string().trim().optional().nullable(),
    priority: z.coerce.number().int().min(0).max(9999).default(100),
    departmentId: z.string().uuid().optional().nullable(),
    costCenterCode: z.string().trim().optional().nullable(),
    workLocationCode: z.string().trim().optional().nullable(),
    jobGradeId: z.string().uuid().optional().nullable(),
    minAmountCents: optionalAmountCents,
    maxAmountCents: optionalAmountCents,
    requiresEligibilityException: z
      .enum(["", "true", "false"])
      .transform((value) =>
        value === "" ? null : value === "true"
      ),
    requiresPolicyException: z
      .enum(["", "true", "false"])
      .transform((value) =>
        value === "" ? null : value === "true"
      ),
    approverKind: hrmOtmApproverKindSchema,
    managerChainDepth: z
      .union([z.coerce.number().int().min(1).max(5), z.literal("")])
      .transform((value) => (value === "" ? null : value)),
    targetUserId: z.string().uuid().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (
      data.minAmountCents != null &&
      data.maxAmountCents != null &&
      data.minAmountCents > data.maxAmountCents
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum amount cannot exceed maximum amount.",
        path: ["maxAmountCents"],
      })
    }
    if (data.approverKind === "specific_user" && !data.targetUserId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target user is required.",
        path: ["targetUserId"],
      })
    }
  })

export { HRM_OTM_APPROVER_KINDS }

export const createOtmEligibilityRuleFormSchema = z.object({
  overtimeTypeId: z.string().uuid(),
  departmentId: z.string().uuid().optional().nullable(),
  jobGradeId: z.string().uuid().optional().nullable(),
  employmentType: z.string().trim().optional().nullable(),
  legalEntityCode: z.string().trim().optional().nullable(),
  countryCode: z.string().trim().optional().nullable(),
  workLocationCode: z.string().trim().optional().nullable(),
  positionId: z.string().uuid().optional().nullable(),
  workerCategory: z.string().trim().optional().nullable(),
  policyGroupCode: z.string().trim().optional().nullable(),
  allowException: z.coerce.boolean().optional(),
})

export {
  HRM_OTM_ROUNDING_MODES,
  hrmOtmRoundingModeSchema,
  type HrmOtmRoundingMode,
} from "./otm-workflow-state.shared"

const optionalPositiveInt = z
  .union([z.coerce.number().int().min(0), z.literal("")])
  .transform((value) => (value === "" ? null : value))

export const upsertOtmPolicyFormSchema = z.object({
  minDurationMinutes: z.coerce.number().int().min(0),
  dailyCapMinutes: optionalPositiveInt,
  weeklyCapMinutes: optionalPositiveInt,
  monthlyCapMinutes: optionalPositiveInt,
  roundingIntervalMinutes: optionalPositiveInt,
  roundingMode: hrmOtmRoundingModeSchema,
  compareAttendanceEnabled: z.coerce.boolean().optional(),
  compareShiftEnabled: z.coerce.boolean().optional(),
  claimDeadlineDays: optionalPositiveInt,
  enforceClaimDeadlineOnSubmit: z.coerce.boolean().optional(),
  requireHrSecondApproval: z.coerce.boolean().optional(),
  managerChainMaxDepth: z.coerce.number().int().min(1).max(5).optional(),
  allowCompensatoryTime: z.coerce.boolean().optional(),
  compensatoryLeaveTypeCode: z
    .string()
    .trim()
    .max(32)
    .optional()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  defaultEarningCode: z.string().trim().min(1).max(32),
})

export const otmExceptionDecisionSchema = z.object({
  exceptionId: z.string().uuid(),
  decisionNote: z.string().trim().optional().nullable(),
})

export const createOtmRateRuleFormSchema = z.object({
  overtimeTypeId: z.string().uuid(),
  multiplier: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Use a number like 1.5"),
  countryCode: z.string().trim().optional().nullable(),
  workerCategory: z.string().trim().optional().nullable(),
  earningCode: z.string().trim().optional().nullable(),
  effectiveFrom: z.string().optional().nullable(),
  effectiveTo: z.string().optional().nullable(),
})

export const markOtmPayrollReadySchema = z.object({
  requestId: z.string().uuid(),
})
