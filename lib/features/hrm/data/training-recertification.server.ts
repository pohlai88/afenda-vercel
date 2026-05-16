import type { HrmTrainingRecord } from "./training.types.shared"

export type RecertificationDueBand = "30" | "60" | "90" | "expired"

export function computeTrainingExpiresAtDate(
  completedAt: Date,
  recertificationIntervalMonths: number | null | undefined
): Date | null {
  if (!recertificationIntervalMonths || recertificationIntervalMonths <= 0) {
    return null
  }
  const expires = new Date(completedAt)
  expires.setUTCMonth(expires.getUTCMonth() + recertificationIntervalMonths)
  return expires
}

export function classifyRecertificationDueBand(
  expiresAt: Date,
  asOf: Date = new Date()
): RecertificationDueBand | null {
  const msPerDay = 86_400_000
  const daysUntil = Math.ceil((expiresAt.getTime() - asOf.getTime()) / msPerDay)
  if (daysUntil < 0) return "expired"
  if (daysUntil <= 30) return "30"
  if (daysUntil <= 60) return "60"
  if (daysUntil <= 90) return "90"
  return null
}

export function buildRecertificationSourceReference(
  record: Pick<HrmTrainingRecord, "id" | "completedAt">
): string {
  const year = record.completedAt.getUTCFullYear()
  const month = String(record.completedAt.getUTCMonth() + 1).padStart(2, "0")
  return `record:${record.id}:${year}-${month}`
}

export function isRecertificationAssignmentDuplicate(input: {
  readonly existingSourceReference: string | null
  readonly sourceReference: string
}): boolean {
  return input.existingSourceReference === input.sourceReference
}
