import { z } from "zod"

import { CLAIM_EVIDENCE_TYPES } from "../data/claim-helpers.shared"

/**
 * Claim form schemas — Phase 4.
 * Used by submit / cancel / approve / reject / attach-evidence Server Actions.
 *
 * Server Actions also re-validate `claimDate <= today` and
 * `amount <= perClaimLimit` against the resolved claim type — the schema is
 * a coarse-grained gate, not a substitute for tenant-bound DB checks.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const ISO_4217 = /^[A-Z]{3}$/

export const submitClaimFormSchema = z.object({
  employeeId: z.string().uuid("Employee ID must be a valid UUID"),
  claimTypeId: z.string().uuid("Claim type ID must be a valid UUID"),
  claimDate: z.string().regex(ISO_DATE, "Claim date must be YYYY-MM-DD"),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .max(1_000_000_000, "Amount is implausibly large"),
  currency: z
    .string()
    .regex(ISO_4217, "Currency must be a 3-letter ISO 4217 code")
    .optional(),
  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters")
    .nullable()
    .default(null),
  policyVersion: z.string().max(64).nullable().default(null),
})

export type SubmitClaimFormValues = z.infer<typeof submitClaimFormSchema>

export const cancelClaimFormSchema = z.object({
  claimId: z.string().uuid("Claim ID must be a valid UUID"),
  cancelledReason: z
    .string()
    .max(1000, "Reason must be at most 1000 characters")
    .nullable()
    .default(null),
})

export type CancelClaimFormValues = z.infer<typeof cancelClaimFormSchema>

export const claimApprovalDecisionSchema = z.object({
  claimId: z.string().uuid("Claim ID must be a valid UUID"),
  decisionNote: z
    .string()
    .max(1000, "Note must be at most 1000 characters")
    .nullable()
    .default(null),
})

export type ClaimApprovalDecisionValues = z.infer<
  typeof claimApprovalDecisionSchema
>

export const claimRejectDecisionSchema = claimApprovalDecisionSchema.extend({
  rejectedReason: z
    .string()
    .min(1, "Rejection reason is required")
    .max(1000, "Reason must be at most 1000 characters"),
})

export type ClaimRejectDecisionValues = z.infer<
  typeof claimRejectDecisionSchema
>

export const attachClaimEvidenceFormSchema = z.object({
  claimId: z.string().uuid("Claim ID must be a valid UUID"),
  documentId: z.string().uuid("Document ID must be a valid UUID"),
  evidenceType: z.enum(CLAIM_EVIDENCE_TYPES).default("receipt"),
  notes: z.string().max(1000).nullable().default(null),
})

export type AttachClaimEvidenceFormValues = z.infer<
  typeof attachClaimEvidenceFormSchema
>
