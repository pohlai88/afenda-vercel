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
  readonly effectiveTo?: BenefitDateInput | null
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

function normalizeCoverageEnd(params: {
  readonly terminatedAt: BenefitDateInput | null | undefined
  readonly effectiveTo?: BenefitDateInput | null | undefined
}): number {
  const ends: number[] = []
  if (params.terminatedAt) {
    ends.push(toBenefitUtcDay(params.terminatedAt, "terminatedAt"))
  }
  if (params.effectiveTo) {
    ends.push(toBenefitUtcDay(params.effectiveTo, "effectiveTo"))
  }
  if (ends.length === 0) return OPEN_ENDED_UTC_DAY
  return Math.min(...ends)
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
  readonly candidateEffectiveTo?: BenefitDateInput | null
  readonly existing: readonly BenefitEnrollmentWindowRow[]
  readonly excludeEnrollmentId?: string | null
}): BenefitEnrollmentCoverageConflict | null {
  const candidateStart = toBenefitUtcDay(params.candidateStart, "effectiveFrom")
  const candidateEnd = normalizeCoverageEnd({
    terminatedAt: params.candidateEnd,
    effectiveTo: params.candidateEffectiveTo,
  })

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
    const existingEnd = normalizeCoverageEnd({
      terminatedAt: row.terminatedAt,
      effectiveTo: row.effectiveTo,
    })

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
