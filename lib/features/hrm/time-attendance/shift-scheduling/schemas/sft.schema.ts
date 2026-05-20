import { z } from "zod"

import {
  normalizeShiftCode,
  SHIFT_HOLIDAY_BEHAVIORS,
  SFT_PATTERN_KINDS,
  SFT_SHIFT_CATEGORIES,
} from "../data/sft-shift.shared"

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")

const shiftClockTimeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Must be HH:mm")

const wholeMinutesSchema = z.coerce
  .number()
  .int("Must be a whole number")
  .min(0, "Must be zero or greater")

const positiveMinutesSchema = z.coerce
  .number()
  .int("Must be a whole number")
  .min(1, "Must be greater than zero")

export const createShiftTemplateSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Code is required")
      .max(24, "Code must be 24 characters or less")
      .transform(normalizeShiftCode)
      .refine((value) => /^[A-Z0-9_]+$/.test(value), {
        message: "Use letters, numbers, and underscores only",
      }),
    name: z.string().trim().min(1, "Name is required").max(120),
    defaultStartTime: shiftClockTimeSchema,
    defaultEndTime: shiftClockTimeSchema,
    unpaidBreakMinutes: wholeMinutesSchema.default(0),
    paidBreakMinutes: wholeMinutesSchema.default(0),
    lateGraceMinutes: wholeMinutesSchema.default(0),
    earlyOutGraceMinutes: wholeMinutesSchema.default(0),
    overtimeGraceMinutes: wholeMinutesSchema.default(0),
    maxContinuousClockMinutes: positiveMinutesSchema.default(960),
    holidayBehavior: z.enum(SHIFT_HOLIDAY_BEHAVIORS).default("scheduled"),
    shiftCategory: z.enum(SFT_SHIFT_CATEGORIES).default("general"),
    patternKind: z.enum(SFT_PATTERN_KINDS).default("fixed"),
  })
  .refine((value) => value.defaultStartTime !== value.defaultEndTime, {
    message: "Start and end cannot be the same time",
    path: ["defaultEndTime"],
  })

export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>

export const assignEmployeeShiftSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee is required"),
  attendanceDate: isoDateSchema,
  shiftTemplateId: z.string().trim().min(1, "Shift template is required"),
})

export type AssignEmployeeShiftInput = z.infer<typeof assignEmployeeShiftSchema>

export const bulkAssignEmployeeShiftsSchema = z.object({
  employeeIds: z
    .string()
    .trim()
    .min(1, "Select at least one employee")
    .transform((raw) =>
      raw
        .split(/[\n,;]+/)
        .map((id) => id.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string().min(1)).min(1, "Select at least one employee")),
  rangeStart: isoDateSchema,
  rangeEnd: isoDateSchema,
  shiftTemplateId: z.string().trim().min(1, "Shift template is required"),
})

export type BulkAssignEmployeeShiftsInput = z.infer<
  typeof bulkAssignEmployeeShiftsSchema
>

export const upsertShiftSchedulingPolicySchema = z.object({
  minRestMinutesBetweenShifts: wholeMinutesSchema.default(660),
  maxScheduledMinutesPerWeek: positiveMinutesSchema.default(2880),
  warnOnConflict: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
  blockOnConflict: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
})

export type UpsertShiftSchedulingPolicyInput = z.infer<
  typeof upsertShiftSchedulingPolicySchema
>

export const createRecurrenceRuleSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee is required"),
  shiftTemplateId: z.string().trim().min(1, "Shift template is required"),
  startDate: isoDateSchema,
  endDate: isoDateSchema.optional().nullable(),
  weekday: z.coerce.number().int().min(0).max(6),
})

export type CreateRecurrenceRuleInput = z.infer<
  typeof createRecurrenceRuleSchema
>

export const applyRecurrenceRuleSchema = z.object({
  ruleId: z.string().trim().min(1, "Rule is required"),
  rangeStart: isoDateSchema,
  rangeEnd: isoDateSchema,
})

export const applyRotationCycleSchema = z.object({
  rotationCycleId: z.string().trim().min(1, "Rotation cycle is required"),
  employeeId: z.string().trim().min(1, "Employee is required"),
  rangeStart: isoDateSchema,
  rangeEnd: isoDateSchema,
})

export const createCoverageRequirementSchema = z.object({
  attendanceDate: isoDateSchema,
  shiftTemplateId: z.string().trim().min(1, "Shift template is required"),
  minHeadcount: z.coerce.number().int().min(1, "Minimum headcount is required"),
  departmentId: z.string().trim().optional().nullable(),
  locationCode: z.string().trim().max(64).optional().nullable(),
  requiredSkillId: z.string().trim().optional().nullable(),
})

export const rosterListFiltersSchema = z.object({
  departmentId: z.string().trim().optional().nullable(),
  jobGradeId: z.string().trim().optional().nullable(),
  locationCode: z.string().trim().max(64).optional().nullable(),
})

export type RosterListFiltersInput = z.infer<typeof rosterListFiltersSchema>

export const addRotationStepSchema = z.object({
  rotationCycleId: z.string().trim().min(1, "Rotation cycle is required"),
  shiftTemplateId: z.string().trim().min(1, "Shift template is required"),
})

export type CreateCoverageRequirementInput = z.infer<
  typeof createCoverageRequirementSchema
>

export const createRotationCycleSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(24, "Code must be 24 characters or less")
    .transform(normalizeShiftCode)
    .refine((value) => /^[A-Z0-9_]+$/.test(value), {
      message: "Use letters, numbers, and underscores only",
    }),
  name: z.string().trim().min(1, "Name is required").max(120),
  cycleLengthDays: z.coerce
    .number()
    .int()
    .min(1, "Cycle length must be at least 1 day")
    .max(28, "Cycle length must be 28 days or less")
    .default(7),
  shiftTemplateId: z.string().trim().min(1, "Shift template is required"),
})

export type CreateRotationCycleInput = z.infer<typeof createRotationCycleSchema>

export const submitShiftSwapRequestSchema = z.object({
  requesterAssignmentId: z.string().trim().min(1, "Your shift is required"),
  counterpartyAssignmentId: z
    .string()
    .trim()
    .min(1, "Counterparty shift is required"),
  reason: z
    .string()
    .trim()
    .min(3, "Reason is required (minimum 3 characters)")
    .max(500),
})

export const shiftSwapDecisionSchema = z.object({
  swapRequestId: z.string().trim().min(1, "Swap request is required"),
  decisionNote: z.string().trim().max(500).optional().nullable(),
})

export const shiftSwapRejectSchema = shiftSwapDecisionSchema.extend({
  rejectedReason: z
    .string()
    .trim()
    .min(3, "Rejection reason is required (minimum 3 characters)")
    .max(500),
})

export const shiftSwapReturnSchema = shiftSwapDecisionSchema.extend({
  returnedReason: z
    .string()
    .trim()
    .min(3, "Return reason is required (minimum 3 characters)")
    .max(500),
})

export const shiftSwapOverrideSchema = shiftSwapDecisionSchema.extend({
  overrideNote: z
    .string()
    .trim()
    .min(3, "Override note is required (minimum 3 characters)")
    .max(500),
})

export const publishRosterSchema = z.object({
  periodStart: isoDateSchema,
  periodEnd: isoDateSchema,
  note: z.string().trim().max(500).optional().nullable(),
})

export const rosterRangeSchema = z.object({
  rangeStart: isoDateSchema,
  rangeEnd: isoDateSchema,
})
