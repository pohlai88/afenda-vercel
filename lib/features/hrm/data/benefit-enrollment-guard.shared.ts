import {
  formatBenefitUtcDay,
  toBenefitUtcDay,
  type BenefitDateInput,
} from "./benefit-calendar.shared"

const OPEN_ENDED_UTC_DAY = Date.UTC(9999, 11, 31)

export type BenefitEnrollmentWindowRow = {
  readonly enrollmentId: string
  readonly state: string
  readonly effectiveFrom: BenefitDateInput | null
  readonly enrolledAt: BenefitDateInput | null
  readonly terminatedAt: BenefitDateInput | null
}

export type BenefitEnrollmentCoverageConflict = {
  readonly enrollmentId: string
  readonly state: string
  readonly start: string
  readonly end: string | null
}

function normalizeCoverageStart(
  value: BenefitDateInput | null | undefined,
  fallback: BenefitDateInput
): number {
  return toBenefitUtcDay(value ?? fallback, "effectiveFrom")
}

function normalizeCoverageEnd(
  value: BenefitDateInput | null | undefined
): number {
  return value ? toBenefitUtcDay(value, "terminatedAt") : OPEN_ENDED_UTC_DAY
}

function windowsOverlap(params: {
  readonly candidateStart: number
  readonly candidateEnd: number
  readonly existingStart: number
  readonly existingEnd: number
}): boolean {
  return (
    params.candidateStart <= params.existingEnd &&
    params.existingStart <= params.candidateEnd
  )
}

export function detectBenefitEnrollmentCoverageConflict(params: {
  readonly candidateStart: BenefitDateInput
  readonly candidateEnd?: BenefitDateInput | null
  readonly existing: readonly BenefitEnrollmentWindowRow[]
  readonly excludeEnrollmentId?: string | null
}): BenefitEnrollmentCoverageConflict | null {
  const candidateStart = toBenefitUtcDay(params.candidateStart, "effectiveFrom")
  const candidateEnd = normalizeCoverageEnd(params.candidateEnd)

  for (const row of params.existing) {
    if (
      params.excludeEnrollmentId &&
      row.enrollmentId === params.excludeEnrollmentId
    ) {
      continue
    }
    if (row.state === "waived") {
      continue
    }

    const existingStart = normalizeCoverageStart(
      row.effectiveFrom,
      row.enrolledAt ?? params.candidateStart
    )
    const existingEnd = normalizeCoverageEnd(row.terminatedAt)

    if (
      windowsOverlap({
        candidateStart,
        candidateEnd,
        existingStart,
        existingEnd,
      })
    ) {
      return {
        enrollmentId: row.enrollmentId,
        state: row.state,
        start: formatBenefitUtcDay(existingStart),
        end: row.terminatedAt ? formatBenefitUtcDay(existingEnd) : null,
      }
    }
  }

  return null
}

export function describeBenefitEnrollmentCoverageConflict(
  conflict: BenefitEnrollmentCoverageConflict
): string {
  if (conflict.end) {
    return `Coverage overlaps existing ${conflict.state} enrollment (${conflict.start} to ${conflict.end}).`
  }
  return `Coverage overlaps existing ${conflict.state} enrollment starting ${conflict.start}.`
}
