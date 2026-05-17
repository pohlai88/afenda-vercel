import "server-only"

import type {
  HrmRehireEligibility,
  HrmSettlementReadinessStatus,
} from "./offboarding-exit-status.shared"

export type OffboardingInstanceDetails = {
  readonly exitType: string | null
  readonly exitReason: string | null
  readonly lastWorkingDate: string | null
  readonly noticeStartDate: string | null
  readonly noticeEndDate: string | null
  readonly settlementReadinessStatus: HrmSettlementReadinessStatus
  readonly settlementBlockers: readonly { code: string; message: string }[]
  readonly rehireEligibility: HrmRehireEligibility | null
  readonly rehireEligibilityNote: string | null
  readonly exitInterviewScheduledAt: Date | null
  readonly exitInterviewCompletedAt: Date | null
  readonly exitInterviewNote: string | null
  readonly exitInterviewFeedbackSummary: string | null
  readonly exitInterviewWouldRehire: boolean | null
  readonly approvalReviewNote: string | null
}

export type OffboardingInstanceDetailsPatch = Partial<{
  exitType: string | null
  exitReason: string | null
  lastWorkingDate: string | null
  noticeStartDate: string | null
  noticeEndDate: string | null
  settlementReadinessStatus: HrmSettlementReadinessStatus
  settlementBlockers: readonly { code: string; message: string }[]
  rehireEligibility: HrmRehireEligibility | null
  rehireEligibilityNote: string | null
  exitInterviewScheduledAt: Date | string | null
  exitInterviewCompletedAt: Date | string | null
  exitInterviewNote: string | null
  exitInterviewFeedbackSummary: string | null
  exitInterviewWouldRehire: boolean | null
  approvalReviewNote: string | null
}>

type MutableRecord = Record<string, unknown>

const DEFAULT_SETTLEMENT_STATUS: HrmSettlementReadinessStatus =
  "pending_clearance"

function asRecord(value: unknown): MutableRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? { ...(value as MutableRecord) }
    : {}
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function asBooleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}

function parseDateOrNull(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value !== "string" || !value.trim()) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function serializeDateOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString()
}

function parseSettlementBlockers(
  value: unknown
): readonly { code: string; message: string }[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const row = asRecord(item)
    const code = asStringOrNull(row.code)
    const message = asStringOrNull(row.message)
    return code && message ? [{ code, message }] : []
  })
}

export function readOffboardingInstanceDetails(
  audit7w1h: unknown,
  fallback?: { readonly lastWorkingDate?: string | null }
): OffboardingInstanceDetails {
  const root = asRecord(audit7w1h)
  const details = asRecord(root.offboarding)

  return {
    exitType: asStringOrNull(details.exitType),
    exitReason: asStringOrNull(details.exitReason),
    lastWorkingDate:
      asStringOrNull(details.lastWorkingDate) ?? fallback?.lastWorkingDate ?? null,
    noticeStartDate: asStringOrNull(details.noticeStartDate),
    noticeEndDate: asStringOrNull(details.noticeEndDate),
    settlementReadinessStatus:
      (asStringOrNull(details.settlementReadinessStatus) as
        | HrmSettlementReadinessStatus
        | null) ?? DEFAULT_SETTLEMENT_STATUS,
    settlementBlockers: parseSettlementBlockers(details.settlementBlockers),
    rehireEligibility:
      (asStringOrNull(details.rehireEligibility) as HrmRehireEligibility | null) ??
      null,
    rehireEligibilityNote: asStringOrNull(details.rehireEligibilityNote),
    exitInterviewScheduledAt: parseDateOrNull(details.exitInterviewScheduledAt),
    exitInterviewCompletedAt: parseDateOrNull(details.exitInterviewCompletedAt),
    exitInterviewNote: asStringOrNull(details.exitInterviewNote),
    exitInterviewFeedbackSummary: asStringOrNull(
      details.exitInterviewFeedbackSummary
    ),
    exitInterviewWouldRehire: asBooleanOrNull(
      details.exitInterviewWouldRehire
    ),
    approvalReviewNote: asStringOrNull(details.approvalReviewNote),
  }
}

export function mergeOffboardingInstanceDetails(
  audit7w1h: unknown,
  patch: OffboardingInstanceDetailsPatch
): Record<string, unknown> {
  const root = asRecord(audit7w1h)
  const current = asRecord(root.offboarding)
  const next: MutableRecord = { ...current }

  for (const [key, value] of Object.entries(patch)) {
    if (
      key === "exitInterviewScheduledAt" ||
      key === "exitInterviewCompletedAt"
    ) {
      next[key] = serializeDateOrNull(value as Date | string | null | undefined)
    } else {
      next[key] = value
    }
  }

  next.updatedAt = new Date().toISOString()

  return {
    ...root,
    offboarding: next,
  }
}
