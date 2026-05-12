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
 * Document types accepted by `attachEmployeeDocumentAction` plus the
 * forward-compatible `statutory_pack` value already persisted by Phase
 * 3C. Keeping the union here lets the documents vault filter and the
 * per-employee documents tab share one canonical enum.
 */
export const HRM_DOCUMENT_TYPES = [
  "offer_letter",
  "contract",
  "ic",
  "passport",
  "certification",
  "medical_cert",
  "statutory_pack",
  "payslip",
  "other",
] as const

export type HrmDocumentType = (typeof HRM_DOCUMENT_TYPES)[number]

export function isHrmDocumentType(value: string): value is HrmDocumentType {
  return (HRM_DOCUMENT_TYPES as readonly string[]).includes(value)
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
      return "positive"
    case "ic":
    case "passport":
    case "certification":
      return "info"
    case "medical_cert":
    case "statutory_pack":
      return "info"
    case "payslip":
      return "muted"
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
