import { z } from "zod"

export {
  HRM_DOCUMENT_TYPES,
  HRM_DOCUMENT_GROUPS,
  HRM_DOCUMENT_CLASSIFICATIONS,
  HRM_DOCUMENT_VERIFICATION_STATUSES,
  HRM_DOCUMENT_LIFECYCLE_STATUSES,
  isHrmDocumentType,
  isHrmDocumentGroup,
  isHrmDocumentClassification,
  isHrmDocumentVerificationStatus,
  isHrmDocumentLifecycleStatus,
} from "../data/hrm-document-display.shared"

import {
  HRM_DOCUMENT_TYPES,
  HRM_DOCUMENT_GROUPS,
  HRM_DOCUMENT_CLASSIFICATIONS,
  HRM_DOCUMENT_VERIFICATION_STATUSES,
  HRM_DOCUMENT_LIFECYCLE_STATUSES,
} from "../data/hrm-document-display.shared"

export type {
  HrmDocumentType,
  HrmDocumentGroup,
  HrmDocumentClassification,
  HrmDocumentVerificationStatus,
  HrmDocumentLifecycleStatus,
} from "../data/hrm-document-display.shared"

const uuid = z.string().uuid()
const payloadHash = z.string().regex(/^[a-f0-9]{64}$/)
const isoDateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")

/**
 * Form schema for attaching a new document to an employee.
 * HRM-DOC-001/002/003/004/005.
 *
 * `expiryDate` maps to `hrm_document.effectiveTo` — the field that the
 * document-expiry-watch cron uses to drive HRM-DOC-011/012/013 alerts.
 * `versionNumber` is the document revision number stored with the vault row.
 * `isMandatory` flags whether this document type is required for the employee.
 */
export const attachEmployeeDocumentFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: uuid,
  blobUrl: z.string().url().startsWith("https://"),
  payloadHash,
  mimeType: z.string().min(3).max(128),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(80 * 1024 * 1024),
  title: z.string().min(1).max(512),
  documentType: z.enum(HRM_DOCUMENT_TYPES),
  documentGroup: z.enum(HRM_DOCUMENT_GROUPS).optional(),
  classification: z.enum(HRM_DOCUMENT_CLASSIFICATIONS),
  legalEntityId: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      uuid.optional()
    )
    .optional(),
  retentionPolicyCode: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.string().trim().min(1).max(128).optional()
    )
    .optional(),
  effectiveFrom: isoDateOnly,
  /**
   * Expiry date (maps to effectiveTo). Required for identity docs, work
   * permits, visas, certifications, and compliance forms. HRM-DOC-011.
   */
  expiryDate: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    isoDateOnly.optional()
  ),
  /**
   * Numeric revision label. HRM-DOC-005.
   * Stored in `versionNumber`; HR can see "Version 2" in the vault.
   */
  versionNumber: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().int().min(1).max(999).optional()
  ),
  /**
   * Whether this document is mandatory for the employee. HRM-DOC-004.
   * Mandatory documents missing from an employee's vault are flagged.
   */
  isMandatory: z.preprocess(
    (v) =>
      v === "true" || v === true
        ? true
        : v === "false" || v === false
          ? false
          : undefined,
    z.boolean().default(false)
  ),
  /** When set, attaches this vault row as `signedDocumentId` on the draft contract. */
  draftContractId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    uuid.optional()
  ),
})

export type AttachEmployeeDocumentFormInput = z.infer<
  typeof attachEmployeeDocumentFormSchema
>

/**
 * HR approval of a submitted document. HRM-DOC-008/009.
 * Sets verificationStatus to "verified".
 */
export const verifyDocumentFormSchema = z.object({
  orgSlug: z.string().min(1),
  documentId: uuid,
  /** Optional HR note explaining the verification decision. */
  reviewNote: z.string().trim().max(1000).optional().nullable(),
})

export type VerifyDocumentFormInput = z.infer<typeof verifyDocumentFormSchema>

/**
 * HR rejection of a submitted document. HRM-DOC-008/010.
 * Sets verificationStatus to "rejected"; captures the rejection reason.
 */
export const rejectDocumentFormSchema = z.object({
  orgSlug: z.string().min(1),
  documentId: uuid,
  /** Required — HR must provide a reason so the employee can correct it. HRM-DOC-010. */
  rejectionReason: z.string().trim().min(1, "Rejection reason is required.").max(1000),
})

export type RejectDocumentFormInput = z.infer<typeof rejectDocumentFormSchema>

/**
 * HR archiving of a document (e.g. after employee separation). HRM-DOC-022.
 * Sets verificationStatus to "archived".
 */
export const archiveDocumentFormSchema = z.object({
  orgSlug: z.string().min(1),
  documentId: uuid,
  archiveReason: z.string().trim().max(500).optional().nullable(),
})

export type ArchiveDocumentFormInput = z.infer<typeof archiveDocumentFormSchema>

/**
 * Verification status filter for the HR documents vault search. HRM-DOC-020.
 */
export const documentVaultFilterSchema = z.object({
  orgSlug: z.string().min(1),
  documentType: z.enum(HRM_DOCUMENT_TYPES).optional(),
  documentGroup: z.enum(HRM_DOCUMENT_GROUPS).optional(),
  classification: z.enum(HRM_DOCUMENT_CLASSIFICATIONS).optional(),
  verificationStatus: z.enum(HRM_DOCUMENT_VERIFICATION_STATUSES).optional(),
  documentLifecycleStatus: z.enum(HRM_DOCUMENT_LIFECYCLE_STATUSES).optional(),
  employeeId: uuid.optional(),
  legalEntityId: uuid.optional(),
  uploadedFrom: isoDateOnly.optional(),
  uploadedTo: isoDateOnly.optional(),
  isMandatory: z.coerce.boolean().optional(),
  latestOnly: z.coerce.boolean().optional(),
  /**
   * Filter by expiry proximity: "expiring_soon" = within 30 days, "expired" = past effectiveTo.
   * HRM-DOC-012/013.
   */
  expiryStatus: z.enum(["expiring_soon", "expired", "valid"]).optional(),
})

export type DocumentVaultFilterInput = z.infer<typeof documentVaultFilterSchema>
