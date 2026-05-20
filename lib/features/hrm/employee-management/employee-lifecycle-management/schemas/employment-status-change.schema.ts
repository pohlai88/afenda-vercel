import { z } from "zod"

import {
  HRM_EMPLOYMENT_STATUSES,
  HRM_LIFECYCLE_MOVEMENT_KINDS,
  HRM_PROBATION_OUTCOMES,
} from "../data/employee-lifecycle-stage.shared"

const uuid = z.string().uuid()

/** ISO date string YYYY-MM-DD (no time component). */
const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Must be a date in YYYY-MM-DD format.",
})

const optionalIsoDateOnly = isoDateOnly.optional()

const orgSlug = z.string().min(1)

const employeeId = uuid

// ── Probation outcome ──────────────────────────────────────────────────────

/**
 * Records the HR outcome of a probation review.
 * HRM-LCY-008/009 — confirmation | extension | termination_recommended.
 */
export const recordProbationOutcomeFormSchema = z
  .object({
    orgSlug,
    employeeId,
    contractId: uuid,
    outcome: z.enum(HRM_PROBATION_OUTCOMES),
    /**
     * Required when outcome is "extended" — new probation end date. HRM-LCY-008.
     */
    newProbationEndDate: isoDateOnly.optional(),
    /**
     * Required when outcome is "termination_recommended". HRM-LCY-008.
     */
    terminationReason: z.string().min(1).max(2000).optional(),
    reviewerNote: z.string().max(2000).optional(),
    effectiveDate: isoDateOnly,
  })
  .superRefine((d, ctx) => {
    if (d.outcome === "extended" && !d.newProbationEndDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "New probation end date is required when extending probation.",
        path: ["newProbationEndDate"],
      })
    }
    if (d.outcome === "termination_recommended" && !d.terminationReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Termination reason is required when recommending termination.",
        path: ["terminationReason"],
      })
    }
  })

export type RecordProbationOutcomeFormInput = z.infer<
  typeof recordProbationOutcomeFormSchema
>

// ── Confirmation ──────────────────────────────────────────────────────────

/**
 * Confirms an employee's employment after probation or admin override. HRM-LCY-009/010.
 */
export const confirmEmploymentFormSchema = z.object({
  orgSlug,
  employeeId,
  effectiveDate: isoDateOnly,
  confirmationNote: z.string().max(2000).optional(),
})

export type ConfirmEmploymentFormInput = z.infer<
  typeof confirmEmploymentFormSchema
>

// ── Suspension ────────────────────────────────────────────────────────────

/**
 * Places an employee on suspension. HRM-LCY-017.
 * Requires reason, effective date, and approval reference.
 */
export const suspendEmployeeFormSchema = z.object({
  orgSlug,
  employeeId,
  suspensionReason: z.string().min(1).max(2000),
  approvalReference: z.string().min(1).max(500),
  effectiveDate: isoDateOnly,
})

export type SuspendEmployeeFormInput = z.infer<typeof suspendEmployeeFormSchema>

/**
 * Lifts a suspension and returns the employee to active service. HRM-LCY-017.
 */
export const liftSuspensionFormSchema = z.object({
  orgSlug,
  employeeId,
  /** Employment status to restore — must be a valid non-suspended status. */
  restoreToStatus: z.enum(["active", "confirmed", "probation"]),
  liftReason: z.string().min(1).max(2000),
  effectiveDate: isoDateOnly,
})

export type LiftSuspensionFormInput = z.infer<typeof liftSuspensionFormSchema>

// ── Resignation ───────────────────────────────────────────────────────────

/**
 * Records a resignation submission and starts notice period tracking. HRM-LCY-018/019.
 */
export const recordResignationFormSchema = z.object({
  orgSlug,
  employeeId,
  resignationDate: isoDateOnly,
  lastWorkingDate: isoDateOnly,
  /** Number of calendar notice days (informational; used to validate `lastWorkingDate`). */
  noticePeriodDays: z.number().int().min(0).optional(),
  resignationNote: z.string().max(2000).optional(),
})

export type RecordResignationFormInput = z.infer<
  typeof recordResignationFormSchema
>

/**
 * Overrides or confirms the last working date after a resignation is accepted. HRM-LCY-019.
 */
export const setLastWorkingDateFormSchema = z.object({
  orgSlug,
  employeeId,
  lastWorkingDate: isoDateOnly,
  reason: z.string().max(500).optional(),
})

export type SetLastWorkingDateFormInput = z.infer<
  typeof setLastWorkingDateFormSchema
>

// ── Termination ───────────────────────────────────────────────────────────

/**
 * Initiates a lifecycle-level termination event (distinct from contract termination). HRM-LCY-021.
 * Records termination reason and approval reference on the employee lifecycle ledger.
 */
export const initiateTerminationFormSchema = z.object({
  orgSlug,
  employeeId,
  terminationReason: z.string().min(1).max(2000),
  approvalReference: z.string().min(1).max(500),
  effectiveDate: isoDateOnly,
  lastWorkingDate: optionalIsoDateOnly,
})

export type InitiateTerminationFormInput = z.infer<
  typeof initiateTerminationFormSchema
>

// ── Retirement ────────────────────────────────────────────────────────────

/**
 * Records a retirement lifecycle event. HRM-LCY-022.
 */
export const recordRetirementFormSchema = z.object({
  orgSlug,
  employeeId,
  retirementDate: isoDateOnly,
  lastWorkingDate: isoDateOnly,
  retirementNote: z.string().max(2000).optional(),
})

export type RecordRetirementFormInput = z.infer<
  typeof recordRetirementFormSchema
>

// ── Employee movement ─────────────────────────────────────────────────────

/**
 * Records a lateral or vertical movement event (promotion, transfer, demotion,
 * department/location/manager/grade/job change). HRM-LCY-011–014.
 *
 * Movement events are effective-dated and recorded in `hrm_lifecycle_event`.
 * The actual employee master fields (department, position, grade, manager, etc.)
 * are updated in the same transaction.
 */
export const recordEmployeeMovementFormSchema = z.object({
  orgSlug,
  employeeId,
  movementKind: z.enum(HRM_LIFECYCLE_MOVEMENT_KINDS),
  effectiveDate: isoDateOnly,
  /** Previous values captured at point of recording (free-form JSON for audit). */
  previousValues: z.record(z.string(), z.unknown()).optional(),
  /** New values that the movement applies. */
  newValues: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().min(1).max(2000).optional(),
  approvalReference: z.string().max(500).optional(),
})

export type RecordEmployeeMovementFormInput = z.infer<
  typeof recordEmployeeMovementFormSchema
>

// ── General status change ─────────────────────────────────────────────────

/**
 * Generic employment status change form — used for ad-hoc HR corrections
 * where no specialised form applies. HRM-LCY-002/010.
 */
export const changeEmploymentStatusFormSchema = z.object({
  orgSlug,
  employeeId,
  newStatus: z.enum(HRM_EMPLOYMENT_STATUSES),
  reason: z.string().min(1).max(2000),
  effectiveDate: isoDateOnly,
})

export type ChangeEmploymentStatusFormInput = z.infer<
  typeof changeEmploymentStatusFormSchema
>
