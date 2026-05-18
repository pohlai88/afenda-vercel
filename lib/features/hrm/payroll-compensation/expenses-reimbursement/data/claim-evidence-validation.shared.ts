import type { ClaimEvidenceType } from "./claim-helpers.shared"

/** Document types accepted when `evidenceType` is `receipt`. */
export const CLAIM_RECEIPT_DOCUMENT_TYPES = [
  "expense_receipt",
  "receipt",
  "invoice",
] as const

export type ClaimEvidenceDocumentSnapshot = {
  readonly documentType: string
  readonly payloadHash: string
  readonly blobUrl: string
  readonly documentLifecycleStatus: string
  readonly verificationStatus: string
  readonly mimeType: string
  readonly sizeBytes: number
}

export type ClaimEvidenceValidationIssueCode =
  | "document_not_active"
  | "document_missing_blob"
  | "receipt_type_mismatch"
  | "receipt_unverified"
  | "duplicate_receipt_payload"

export type ClaimEvidenceValidationIssue = {
  readonly code: ClaimEvidenceValidationIssueCode
  readonly message: string
  readonly blocking: boolean
}

export function isClaimReceiptDocumentType(documentType: string): boolean {
  return (CLAIM_RECEIPT_DOCUMENT_TYPES as readonly string[]).includes(
    documentType
  )
}

export function validateClaimEvidenceDocument(input: {
  readonly evidenceType: ClaimEvidenceType | string
  readonly document: ClaimEvidenceDocumentSnapshot
  readonly duplicateReceiptOnOtherClaim: boolean
}): readonly ClaimEvidenceValidationIssue[] {
  const issues: ClaimEvidenceValidationIssue[] = []

  if (input.document.documentLifecycleStatus !== "active") {
    issues.push({
      code: "document_not_active",
      message: "Document is not active — upload a current version.",
      blocking: true,
    })
  }

  if (!input.document.blobUrl.trim()) {
    issues.push({
      code: "document_missing_blob",
      message: "Document has no stored file — re-upload before attaching.",
      blocking: true,
    })
  }

  if (
    input.evidenceType === "receipt" &&
    !isClaimReceiptDocumentType(input.document.documentType)
  ) {
    issues.push({
      code: "receipt_type_mismatch",
      message:
        "Receipt evidence must use an expense receipt, receipt, or invoice document type.",
      blocking: true,
    })
  }

  if (
    input.evidenceType === "receipt" &&
    input.document.verificationStatus === "rejected"
  ) {
    issues.push({
      code: "receipt_unverified",
      message: "Receipt was rejected in the document vault — upload a new file.",
      blocking: true,
    })
  }

  if (input.duplicateReceiptOnOtherClaim) {
    issues.push({
      code: "duplicate_receipt_payload",
      message:
        "This receipt file is already linked to another open claim. Use a different upload or resolve the duplicate.",
      blocking: true,
    })
  }

  return issues
}

export function firstBlockingClaimEvidenceIssue(
  issues: readonly ClaimEvidenceValidationIssue[]
): ClaimEvidenceValidationIssue | null {
  return issues.find((issue) => issue.blocking) ?? null
}
