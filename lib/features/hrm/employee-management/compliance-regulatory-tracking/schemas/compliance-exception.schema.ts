import { z } from "zod"

import {
  HRM_COMPLIANCE_EXCEPTION_AREAS,
  HRM_COMPLIANCE_EXCEPTION_SEVERITIES,
  HRM_COMPLIANCE_EXCEPTION_STATUSES,
} from "../data/compliance-status.shared"

export {
  HRM_COMPLIANCE_EXCEPTION_AREAS,
  HRM_COMPLIANCE_EXCEPTION_SEVERITIES,
} from "../data/compliance-status.shared"
export type {
  HrmComplianceExceptionArea,
  HrmComplianceExceptionSeverity,
} from "../data/compliance-status.shared"

const uuid = z.string().uuid()
const orgSlug = z.string().min(1)

const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Must be a date in YYYY-MM-DD format.",
})

// ── Create exception ──────────────────────────────────────────────────────

/**
 * Creates a new compliance exception record. HRM-CMP-017.
 *
 * HR or an automated rule identifies a compliance gap and records it.
 * Optionally assigns an immediate corrective action owner and due date.
 */
export const createComplianceExceptionFormSchema = z.object({
  orgSlug,
  /** Employee the exception applies to; omit for org-level exceptions. */
  employeeId: uuid.optional(),
  complianceArea: z.enum(HRM_COMPLIANCE_EXCEPTION_AREAS),
  /** Specific item type (e.g. "passport", "safety_training", "code_of_conduct"). */
  itemType: z.string().min(1).max(200),
  /** ID of the source record (documentId, trainingAssignmentId, etc.). */
  sourceReferenceId: z.string().max(200).optional(),
  /** Readable title for the exception. */
  title: z.string().min(1).max(500),
  severity: z.enum(HRM_COMPLIANCE_EXCEPTION_SEVERITIES),
  /** Optional immediate corrective action assignment. HRM-CMP-018. */
  correctiveActionOwnerUserId: uuid.optional(),
  correctiveActionDueDate: isoDateOnly.optional(),
  correctiveActionDescription: z.string().max(2000).optional(),
})

export type CreateComplianceExceptionFormInput = z.infer<
  typeof createComplianceExceptionFormSchema
>

// ── Assign corrective action ──────────────────────────────────────────────

/**
 * Assigns or updates the corrective action on an open exception. HRM-CMP-018.
 */
export const assignCorrectiveActionFormSchema = z.object({
  orgSlug,
  exceptionId: uuid,
  correctiveActionOwnerUserId: uuid,
  correctiveActionDueDate: isoDateOnly,
  correctiveActionDescription: z.string().min(1).max(2000),
})

export type AssignCorrectiveActionFormInput = z.infer<
  typeof assignCorrectiveActionFormSchema
>

// ── Update corrective action progress ────────────────────────────────────

/**
 * Records a progress update on an in-progress corrective action. HRM-CMP-019.
 */
export const updateCorrectiveActionProgressFormSchema = z.object({
  orgSlug,
  exceptionId: uuid,
  progressNote: z.string().min(1).max(2000),
  /** Optional link to an evidence document. HRM-CMP-020. */
  evidenceDocumentId: uuid.optional(),
})

export type UpdateCorrectiveActionProgressFormInput = z.infer<
  typeof updateCorrectiveActionProgressFormSchema
>

// ── Resolve exception ─────────────────────────────────────────────────────

/**
 * Marks a compliance exception as resolved. HRM-CMP-019.
 * Requires evidence or a resolution note.
 */
export const resolveComplianceExceptionFormSchema = z.object({
  orgSlug,
  exceptionId: uuid,
  resolutionNote: z.string().min(1).max(2000),
  /** Supporting evidence document. HRM-CMP-020. */
  evidenceDocumentId: uuid.optional(),
})

export type ResolveComplianceExceptionFormInput = z.infer<
  typeof resolveComplianceExceptionFormSchema
>

// ── Waive exception ───────────────────────────────────────────────────────

/**
 * Grants a formal waiver for a compliance exception. HRM-CMP-017.
 * Requires a documented reason and authorization reference.
 */
export const waiveComplianceExceptionFormSchema = z.object({
  orgSlug,
  exceptionId: uuid,
  waiverReason: z.string().min(1).max(2000),
  /** Approval reference for the waiver decision (letter ref, committee resolution). */
  approvalReference: z.string().min(1).max(500),
})

export type WaiveComplianceExceptionFormInput = z.infer<
  typeof waiveComplianceExceptionFormSchema
>

// ── Status change filter ──────────────────────────────────────────────────

/**
 * Filter options for listing compliance exceptions. HRM-CMP-022/023.
 */
export const complianceExceptionFilterSchema = z.object({
  status: z.enum(HRM_COMPLIANCE_EXCEPTION_STATUSES).optional(),
  complianceArea: z.enum(HRM_COMPLIANCE_EXCEPTION_AREAS).optional(),
  employeeId: uuid.optional(),
  /** Filter by corrective action owner. HRM-CMP-018. */
  correctiveActionOwnerUserId: uuid.optional(),
  /** Filter exceptions with corrective action due on or before this date. */
  overdueAsOf: isoDateOnly.optional(),
})

export type ComplianceExceptionFilterInput = z.infer<
  typeof complianceExceptionFilterSchema
>
