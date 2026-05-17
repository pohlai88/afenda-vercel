import { hrmDocumentGroupForType } from "./hrm-document-display.shared"

export const HRM_DOCUMENT_EXPIRING_SOON_DAYS = 30

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type HrmDocumentExpiryState = "none" | "valid" | "expiring_soon" | "expired"

export type HrmDocumentReadinessState =
  | "ready"
  | "missing"
  | "pending_verification"
  | "rejected"
  | "expired"
  | "archived"

export function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY)
}

export function deriveHrmDocumentGroup(documentType: string): string {
  return hrmDocumentGroupForType(documentType)
}

export function blobUrlMatchesOrgHrmEmployeePath(
  blobUrl: string,
  organizationId: string,
  employeeId: string
): boolean {
  try {
    const path = decodeURIComponent(new URL(blobUrl).pathname)
    return path.includes(`/orgs/${organizationId}/hrm/${employeeId}/`)
  } catch {
    return false
  }
}

export function deriveHrmDocumentExpiryState(input: {
  effectiveTo: Date | null
  now: Date
}): HrmDocumentExpiryState {
  if (!input.effectiveTo) return "none"
  if (input.effectiveTo.getTime() < input.now.getTime()) return "expired"
  const cutoff = addUtcDays(input.now, HRM_DOCUMENT_EXPIRING_SOON_DAYS)
  return input.effectiveTo.getTime() <= cutoff.getTime()
    ? "expiring_soon"
    : "valid"
}

export function deriveEffectiveDocumentVerificationStatus(input: {
  verificationStatus: string
  documentLifecycleStatus: string | null
  effectiveTo: Date | null
  now: Date
}): string {
  if (input.documentLifecycleStatus === "archived") return "archived"
  if (input.documentLifecycleStatus === "deleted") return "archived"
  if (
    input.verificationStatus !== "archived" &&
    input.effectiveTo &&
    input.effectiveTo.getTime() < input.now.getTime()
  ) {
    return "expired"
  }
  return input.verificationStatus
}

export function canEmployeeAccessDocument(input: {
  classification: string
  requirementAllowsEmployeeAccess: boolean
}): boolean {
  if (input.classification === "public" || input.classification === "internal") {
    return true
  }
  return input.requirementAllowsEmployeeAccess
}

export function readinessStateForDocument(input: {
  verificationStatus: string
  documentLifecycleStatus: string | null
  effectiveTo: Date | null
  now: Date
}): HrmDocumentReadinessState {
  const effective = deriveEffectiveDocumentVerificationStatus(input)
  if (effective === "verified") return "ready"
  if (effective === "rejected") return "rejected"
  if (effective === "expired") return "expired"
  if (effective === "archived" || input.documentLifecycleStatus === "archived") {
    return "archived"
  }
  return "pending_verification"
}
