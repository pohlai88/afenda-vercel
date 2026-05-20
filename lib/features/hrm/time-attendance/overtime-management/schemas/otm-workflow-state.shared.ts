import { z } from "zod"

/** Overtime day categories (HRM-OTM-006). */
export const HRM_OTM_DAY_CATEGORIES = [
  "normal_day",
  "rest_day",
  "off_day",
  "public_holiday",
  "night",
  "emergency",
] as const

export type HrmOtmDayCategory = (typeof HRM_OTM_DAY_CATEGORIES)[number]

export const hrmOtmDayCategorySchema = z.enum(HRM_OTM_DAY_CATEGORIES)

/** Planned vs actual overtime capture (HRM-OTM-003). */
export const HRM_OTM_TIMING_KINDS = ["planned", "actual"] as const

export type HrmOtmTimingKind = (typeof HRM_OTM_TIMING_KINDS)[number]

export const hrmOtmTimingKindSchema = z.enum(HRM_OTM_TIMING_KINDS)

/**
 * Request lifecycle (HRM-OTM-025).
 * Phase 1 MVP targets draft → submitted → pending → approved | rejected | returned | cancelled.
 */
export const HRM_OTM_REQUEST_STATES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "returned",
  "cancelled",
  "payroll_ready",
  "paid",
] as const

export type HrmOtmRequestState = (typeof HRM_OTM_REQUEST_STATES)[number]

export const hrmOtmRequestStateSchema = z.enum(HRM_OTM_REQUEST_STATES)

export const HRM_OTM_INITIATED_BY = ["employee", "manager", "hr"] as const

export type HrmOtmInitiatedBy = (typeof HRM_OTM_INITIATED_BY)[number]

export const hrmOtmInitiatedBySchema = z.enum(HRM_OTM_INITIATED_BY)

export const HRM_OTM_ROUNDING_MODES = [
  "none",
  "up",
  "down",
  "nearest",
] as const

export type HrmOtmRoundingMode = (typeof HRM_OTM_ROUNDING_MODES)[number]

export const hrmOtmRoundingModeSchema = z.enum(HRM_OTM_ROUNDING_MODES)

export const HRM_OTM_EXCEPTION_TYPES = [
  "late_submission",
  "exceeded_cap",
  "missing_attendance",
  "shift_variance",
  "unplanned",
] as const

export type HrmOtmExceptionType = (typeof HRM_OTM_EXCEPTION_TYPES)[number]

export const hrmOtmExceptionTypeSchema = z.enum(HRM_OTM_EXCEPTION_TYPES)

export const HRM_OTM_EXCEPTION_STATES = ["pending", "approved", "rejected"] as const

export type HrmOtmExceptionState = (typeof HRM_OTM_EXCEPTION_STATES)[number]

export const hrmOtmExceptionStateSchema = z.enum(HRM_OTM_EXCEPTION_STATES)
