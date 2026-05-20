import { z } from "zod"

import {
  HRM_COMPLIANCE_FILING_CATEGORIES,
  HRM_COMPLIANCE_FILING_STATUSES,
} from "../data/compliance-status.shared"

export {
  HRM_COMPLIANCE_FILING_CATEGORIES,
  HRM_COMPLIANCE_FILING_STATUSES,
} from "../data/compliance-status.shared"
export type {
  HrmComplianceFilingCategory,
  HrmComplianceFilingStatus,
} from "../data/compliance-status.shared"

const uuid = z.string().uuid()
const orgSlug = z.string().min(1)

const isoDateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: "Must be a date in YYYY-MM-DD format.",
})

// ── Create filing requirement ─────────────────────────────────────────────

/**
 * Records a new mandatory filing requirement in the regulatory calendar. HRM-CMP-009/010.
 *
 * Used by HR to enter a statutory or regulatory filing obligation, its due date,
 * and the responsible authority.
 */
export const createComplianceFilingFormSchema = z.object({
  orgSlug,
  title: z.string().min(1).max(500),
  filingCategory: z.enum(HRM_COMPLIANCE_FILING_CATEGORIES),
  /** ISO-2 country code (e.g. "MY", "SG"). */
  countryCode: z.string().length(2).toUpperCase().optional(),
  legalEntityCode: z.string().max(100).optional(),
  legalEntityName: z.string().max(200).optional(),
  workLocationCode: z.string().max(100).optional(),
  employmentType: z.string().max(100).optional(),
  workerCategory: z.string().max(100).optional(),
  /** Statutory authority name (e.g. "LHDN", "KWSP", "SOCSO"). */
  filingAuthority: z.string().max(200).optional(),
  /** Form number or act reference (e.g. "CP8D", "Form E"). */
  referenceCode: z.string().max(100).optional(),
  /** Deadline for submission. HRM-CMP-010. */
  dueDate: isoDateOnly,
  /** Coverage period label (e.g. "FY2025", "2026-Q1"). */
  coveragePeriod: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
})

export type CreateComplianceFilingFormInput = z.infer<
  typeof createComplianceFilingFormSchema
>

// ── Mark filing as submitted ──────────────────────────────────────────────

/**
 * Marks a pending filing as submitted to the authority. HRM-CMP-009.
 *
 * Records the submission timestamp, the submitter, and an optional
 * supporting evidence document (upload receipt, submission reference).
 */
export const submitComplianceFilingFormSchema = z.object({
  orgSlug,
  filingId: uuid,
  submittedAt: isoDateOnly,
  /** External reference provided at submission (e.g. acknowledgement number). */
  confirmationReference: z.string().max(200).optional(),
  /** Link to the submission receipt document. HRM-CMP-020. */
  evidenceDocumentId: uuid.optional(),
  notes: z.string().max(1000).optional(),
})

export type SubmitComplianceFilingFormInput = z.infer<
  typeof submitComplianceFilingFormSchema
>

// ── Confirm filing ────────────────────────────────────────────────────────

/**
 * Records official confirmation of receipt by the filing authority. HRM-CMP-009.
 *
 * Transitions the filing to "confirmed" (terminal compliant state).
 */
export const confirmComplianceFilingFormSchema = z.object({
  orgSlug,
  filingId: uuid,
  confirmedAt: isoDateOnly,
  confirmationReference: z.string().min(1).max(200),
  /** Supporting evidence of the authority's confirmation. HRM-CMP-020. */
  evidenceDocumentId: uuid.optional(),
})

export type ConfirmComplianceFilingFormInput = z.infer<
  typeof confirmComplianceFilingFormSchema
>

// ── Waive filing ──────────────────────────────────────────────────────────

/**
 * Formally waives a filing obligation with a documented reason. HRM-CMP-009.
 */
export const waiveComplianceFilingFormSchema = z.object({
  orgSlug,
  filingId: uuid,
  waiverReason: z.string().min(1).max(2000),
  approvalReference: z.string().min(1).max(500),
})

export type WaiveComplianceFilingFormInput = z.infer<
  typeof waiveComplianceFilingFormSchema
>

// ── List / filter filings ─────────────────────────────────────────────────

/**
 * Filter options for the regulatory calendar and compliance reports.
 * HRM-CMP-010/022/023.
 */
export const complianceFilingFilterSchema = z.object({
  status: z.enum(HRM_COMPLIANCE_FILING_STATUSES).optional(),
  filingCategory: z.enum(HRM_COMPLIANCE_FILING_CATEGORIES).optional(),
  countryCode: z.string().length(2).toUpperCase().optional(),
  /** List filings due on or before this date (for overdue dashboard). */
  dueOnOrBefore: isoDateOnly.optional(),
  /** Coverage period filter (e.g. "FY2025"). */
  coveragePeriod: z.string().max(50).optional(),
})

export type ComplianceFilingFilterInput = z.infer<
  typeof complianceFilingFilterSchema
>
