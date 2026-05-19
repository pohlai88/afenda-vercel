import { z } from "zod"

import { HRM_OFFBOARDING_EXIT_TYPES } from "../data/offboarding-exit-type.shared"
import {
  HRM_REHIRE_ELIGIBILITY_VALUES,
  HRM_SETTLEMENT_READINESS_STATUSES,
} from "../data/offboarding-exit-status.shared"

const uuid = z.string().uuid()
const orgSlug = z.string().min(1)

const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Must be a date in YYYY-MM-DD format.",
})

/**
 * Initiates an offboarding process for an employee. HRM-OFF-001/002/003.
 */
export const initiateOffboardingFormSchema = z.object({
  orgSlug,
  employeeId: uuid,
  exitType: z.enum(HRM_OFFBOARDING_EXIT_TYPES),
  exitReason: z.string().min(1).max(2000),
  terminationDate: isoDateOnly,
  lastWorkingDate: isoDateOnly,
  effectiveSeparationDate: isoDateOnly.optional(),
  noticeStartDate: isoDateOnly.optional(),
  noticeEndDate: isoDateOnly.optional(),
  requiredNoticeDays: z.number().int().min(0).max(365).optional(),
  noticeWaived: z.boolean().optional(),
  shortNotice: z.boolean().optional(),
  /** Skip approval workflow and open checklist immediately. */
  skipApproval: z.boolean().optional(),
})

export type InitiateOffboardingFormInput = z.infer<
  typeof initiateOffboardingFormSchema
>

/** Records exit approval or rejection. HRM-OFF-005. */
export const reviewOffboardingApprovalFormSchema = z.object({
  orgSlug,
  instanceId: uuid,
  employeeId: uuid,
  decision: z.enum(["approved", "rejected"]),
  reviewNote: z.string().max(2000).optional(),
})

export type ReviewOffboardingApprovalFormInput = z.infer<
  typeof reviewOffboardingApprovalFormSchema
>

/** Schedules an exit interview. HRM-OFF-009. */
export const scheduleExitInterviewFormSchema = z.object({
  orgSlug,
  instanceId: uuid,
  employeeId: uuid,
  scheduledAt: z.string().datetime({ offset: true }),
  interviewerNote: z.string().max(1000).optional(),
})

export type ScheduleExitInterviewFormInput = z.infer<
  typeof scheduleExitInterviewFormSchema
>

/** Captures exit interview feedback. HRM-OFF-010. */
export const recordExitInterviewFeedbackFormSchema = z.object({
  orgSlug,
  instanceId: uuid,
  employeeId: uuid,
  completedAt: z.string().datetime({ offset: true }),
  feedbackSummary: z.string().min(1).max(5000),
  wouldRehire: z.boolean().optional(),
})

export type RecordExitInterviewFeedbackFormInput = z.infer<
  typeof recordExitInterviewFeedbackFormSchema
>

/** Updates settlement readiness for Payroll. HRM-OFF-018/019. */
export const updateSettlementReadinessFormSchema = z.object({
  orgSlug,
  instanceId: uuid,
  employeeId: uuid,
  settlementReadinessStatus: z.enum(HRM_SETTLEMENT_READINESS_STATUSES),
  finalSettlementReference: z.string().trim().max(160).optional(),
  blockers: z
    .array(
      z.object({
        code: z.string().min(1).max(64),
        message: z.string().min(1).max(500),
      })
    )
    .default([]),
})

export type UpdateSettlementReadinessFormInput = z.infer<
  typeof updateSettlementReadinessFormSchema
>

/** Records rehire eligibility after separation. HRM-OFF-023. */
export const setRehireEligibilityFormSchema = z.object({
  orgSlug,
  instanceId: uuid,
  employeeId: uuid,
  rehireEligibility: z.enum(HRM_REHIRE_ELIGIBILITY_VALUES),
  note: z.string().max(2000).optional(),
})

export type SetRehireEligibilityFormInput = z.infer<
  typeof setRehireEligibilityFormSchema
>

/** Filter for offboarding dashboard. HRM-OFF-026. */
export const offboardingDashboardFilterSchema = z.object({
  exitType: z.enum(HRM_OFFBOARDING_EXIT_TYPES).optional(),
  status: z.string().optional(),
  departmentId: uuid.optional(),
  managerEmployeeId: uuid.optional(),
  legalEntityCode: z.string().trim().max(80).optional(),
  lastWorkingOnOrBefore: isoDateOnly.optional(),
})

export type OffboardingDashboardFilterInput = z.infer<
  typeof offboardingDashboardFilterSchema
>
