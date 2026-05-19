/**
 * Pure HR document display helpers — usable from both Server and Client
 * Components. Centralizes the document-type / classification tone vocabulary
 * and the bytes → human-readable size formatter so the documents vault
 * library, the per-employee documents tab, and any future preview drawer
 * all read the same labels.
 *
 * Mirrors the shape of `attendance-display.shared.ts` (single source of
 * truth for the picker enum + tone resolver), so anything that adds a
 * document type or classification has exactly one place to change.
 */

/**
 * Canonical document type registry. Covers all document categories defined
 * by HRM-DOC-002: employment docs, identity docs, qualification docs,
 * payroll-related docs, policy acknowledgements, HR letters, medical/leave
 * docs, and compliance docs.
 *
 * Adding a new type is a one-file change here; the attach schema, vault
 * filter, and display components all follow automatically.
 */
export const HRM_DOCUMENT_TYPES = [
  // Employment documents
  "offer_letter",
  "contract",
  "appointment_letter",
  "contract_renewal_letter",
  // Identity documents (HRM-DOC-002)
  "ic",
  "passport",
  "work_permit",
  "visa",
  "national_id",
  // Qualification documents
  "certification",
  "degree_certificate",
  "professional_license",
  "training_certificate",
  // Payroll-related documents
  "bank_form",
  "tax_form",
  "statutory_pack",
  "payslip",
  "payroll_declaration",
  // Policy acknowledgements
  "policy_acknowledgement",
  // HR letters
  "hr_letter",
  "confirmation_letter",
  "promotion_letter",
  "transfer_letter",
  "warning_letter",
  "disciplinary_letter",
  // Medical / leave documents
  "medical_cert",
  "fitness_cert",
  "hospitalization_cert",
  "maternity_cert",
  // Compliance documents
  "compliance_form",
  "consent_form",
  "right_to_work",
  // System / internal
  "signature_proof",
  "other",
] as const

export type HrmDocumentType = (typeof HRM_DOCUMENT_TYPES)[number]

export function isHrmDocumentType(value: string): value is HrmDocumentType {
  return (HRM_DOCUMENT_TYPES as readonly string[]).includes(value)
}

export const HRM_DOCUMENT_GROUPS = [
  "employment",
  "identity",
  "qualification",
  "payroll",
  "policy",
  "hr_letter",
  "medical_leave",
  "compliance",
  "system",
  "other",
] as const

export type HrmDocumentGroup = (typeof HRM_DOCUMENT_GROUPS)[number]

export function isHrmDocumentGroup(value: string): value is HrmDocumentGroup {
  return (HRM_DOCUMENT_GROUPS as readonly string[]).includes(value)
}

const DOCUMENT_GROUP_BY_TYPE: Readonly<
  Record<HrmDocumentType, HrmDocumentGroup>
> = {
  offer_letter: "employment",
  contract: "employment",
  appointment_letter: "employment",
  contract_renewal_letter: "employment",
  ic: "identity",
  passport: "identity",
  work_permit: "identity",
  visa: "identity",
  national_id: "identity",
  certification: "qualification",
  degree_certificate: "qualification",
  professional_license: "qualification",
  training_certificate: "qualification",
  bank_form: "payroll",
  tax_form: "payroll",
  statutory_pack: "payroll",
  payslip: "payroll",
  payroll_declaration: "payroll",
  policy_acknowledgement: "policy",
  hr_letter: "hr_letter",
  confirmation_letter: "hr_letter",
  promotion_letter: "hr_letter",
  transfer_letter: "hr_letter",
  warning_letter: "hr_letter",
  disciplinary_letter: "hr_letter",
  medical_cert: "medical_leave",
  fitness_cert: "medical_leave",
  hospitalization_cert: "medical_leave",
  maternity_cert: "medical_leave",
  compliance_form: "compliance",
  consent_form: "compliance",
  right_to_work: "compliance",
  signature_proof: "system",
  other: "other",
}

export function hrmDocumentGroupForType(
  documentType: string
): HrmDocumentGroup {
  return isHrmDocumentType(documentType)
    ? DOCUMENT_GROUP_BY_TYPE[documentType]
    : "other"
}

/** Typed next-intl key — every `HrmDocumentType` must exist under `documentTypes.*`. */
export function hrmDocumentTypeLabelKey(
  value: HrmDocumentType
): `documentTypes.${HrmDocumentType}` {
  return `documentTypes.${value}`
}

/**
 * Verification lifecycle states for an `hrm_document` row.
 * HRM-DOC-008: pending | verified | rejected | expired | archived.
 */
export const HRM_DOCUMENT_VERIFICATION_STATUSES = [
  "pending",
  "verified",
  "rejected",
  "expired",
  "archived",
] as const

export type HrmDocumentVerificationStatus =
  (typeof HRM_DOCUMENT_VERIFICATION_STATUSES)[number]

export function isHrmDocumentVerificationStatus(
  value: string
): value is HrmDocumentVerificationStatus {
  return (HRM_DOCUMENT_VERIFICATION_STATUSES as readonly string[]).includes(
    value
  )
}

/** Tone for `verificationStatus` badge in the vault table. */
export type HrmDocumentVerificationTone =
  | "muted"
  | "neutral"
  | "positive"
  | "destructive"
  | "info"

export function hrmDocumentVerificationTone(
  status: string
): HrmDocumentVerificationTone {
  switch (status) {
    case "pending":
      return "neutral"
    case "verified":
      return "positive"
    case "rejected":
      return "destructive"
    case "expired":
      return "info"
    case "archived":
      return "muted"
    default:
      return "neutral"
  }
}

export const HRM_DOCUMENT_LIFECYCLE_STATUSES = [
  "active",
  "archived",
  "deleted",
] as const

export type HrmDocumentLifecycleStatus =
  (typeof HRM_DOCUMENT_LIFECYCLE_STATUSES)[number]

export function isHrmDocumentLifecycleStatus(
  value: string
): value is HrmDocumentLifecycleStatus {
  return (HRM_DOCUMENT_LIFECYCLE_STATUSES as readonly string[]).includes(value)
}

export function isSensitiveHrmDocumentClassification(
  classification: string
): boolean {
  return classification === "confidential" || classification === "restricted"
}

/**
 * Allowed values of `hrm_document.classification`. Centralized so the
 * vault filter, the badge tone resolver, and the upload form share the
 * same canonical list — adding a level (`top_secret`, `regulator_only`,
 * …) is a one-file change.
 */
export const HRM_DOCUMENT_CLASSIFICATIONS = [
  "public",
  "internal",
  "confidential",
  "restricted",
] as const

export type HrmDocumentClassification =
  (typeof HRM_DOCUMENT_CLASSIFICATIONS)[number]

export function isHrmDocumentClassification(
  value: string
): value is HrmDocumentClassification {
  return (HRM_DOCUMENT_CLASSIFICATIONS as readonly string[]).includes(value)
}

/** Tone vocabulary mirrored from the attendance / leave display modules. */
export type HrmDocumentTypeTone = "info" | "muted" | "neutral" | "positive"

/**
 * Pure mapping from a raw `documentType` to a UI tone. Anything unknown
 * falls through to `"neutral"` so a future document type cannot silently
 * break the vault table styling.
 */
export function hrmDocumentTypeTone(documentType: string): HrmDocumentTypeTone {
  switch (documentType) {
    case "contract":
    case "offer_letter":
    case "appointment_letter":
    case "contract_renewal_letter":
      return "positive"
    case "ic":
    case "passport":
    case "work_permit":
    case "visa":
    case "national_id":
    case "certification":
    case "degree_certificate":
    case "professional_license":
    case "training_certificate":
      return "info"
    case "medical_cert":
    case "fitness_cert":
    case "hospitalization_cert":
    case "maternity_cert":
    case "statutory_pack":
    case "compliance_form":
    case "consent_form":
    case "right_to_work":
      return "info"
    case "policy_acknowledgement":
    case "hr_letter":
    case "confirmation_letter":
    case "promotion_letter":
    case "transfer_letter":
    case "warning_letter":
    case "disciplinary_letter":
      return "neutral"
    case "bank_form":
    case "tax_form":
    case "payroll_declaration":
    case "payslip":
      return "muted"
    case "signature_proof":
    case "other":
      return "muted"
    default:
      return "neutral"
  }
}

/**
 * Tones for `hrm_document.classification` (`public` / `internal` /
 * `confidential` / `restricted`). The vault badge reads tone before label
 * so admins instantly see the highest-sensitivity rows in the table.
 */
export type HrmDocumentClassificationTone =
  | "muted"
  | "neutral"
  | "info"
  | "destructive"

export function hrmDocumentClassificationTone(
  classification: string
): HrmDocumentClassificationTone {
  switch (classification) {
    case "public":
      return "muted"
    case "internal":
      return "neutral"
    case "confidential":
      return "info"
    case "restricted":
      return "destructive"
    default:
      return "neutral"
  }
}

/**
 * Format a byte count as a short human-readable string (`12 KB`, `3.4 MB`,
 * `1.2 GB`). Uses 1024-based (binary) units to match the same convention
 * used by the upload form's multipart threshold (`5 MB = 5 * 1024 * 1024`).
 * Returns `"0 B"` for non-positive / non-finite input — defensive against
 * legacy rows or driver-shape drift.
 */
export function formatHrmDocumentSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"] as const
  let value = sizeBytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  // One decimal for sub-100 values, zero for ≥100, integer for bytes.
  const formatted =
    unit === 0
      ? Math.round(value).toString()
      : value >= 100
        ? Math.round(value).toString()
        : value.toFixed(1)
  return `${formatted} ${units[unit]}`
}

/**
 * Truncate the canonical sha-256 `payloadHash` (64 hex chars) to a short
 * fingerprint suitable for inline display next to the document title.
 * Matches the audit-metadata convention (`payloadHashSuffix: hash.slice(-12)`)
 * so admins can cross-reference an audit row with a vault row without
 * pulling the full 64-char hash on screen.
 */
export function shortenPayloadHash(payloadHash: string): string {
  if (typeof payloadHash !== "string" || payloadHash.length === 0) return ""
  if (payloadHash.length <= 12) return payloadHash
  return `…${payloadHash.slice(-12)}`
}
