import "server-only"

import { createHash } from "node:crypto"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmComplianceEvidence,
  hrmEmployee,
  hrmTrainingRecord,
} from "#lib/db/schema"

import { getTrainingCourseById } from "./training.queries.server"

function periodKeyFromDate(completedAt: Date): string {
  const year = completedAt.getUTCFullYear()
  const month = String(completedAt.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

export async function linkTrainingCompletionToComplianceEvidence(input: {
  readonly organizationId: string
  readonly recordId: string
  readonly actorUserId: string
}): Promise<{ evidenceId: string | null; created: boolean }> {
  const [record] = await db
    .select({
      id: hrmTrainingRecord.id,
      courseId: hrmTrainingRecord.courseId,
      employeeId: hrmTrainingRecord.employeeId,
      completedAt: hrmTrainingRecord.completedAt,
      certificateDocumentId: hrmTrainingRecord.certificateDocumentId,
    })
    .from(hrmTrainingRecord)
    .where(
      and(
        eq(hrmTrainingRecord.organizationId, input.organizationId),
        eq(hrmTrainingRecord.id, input.recordId)
      )
    )
    .limit(1)

  if (!record) {
    return { evidenceId: null, created: false }
  }

  const course = await getTrainingCourseById(
    input.organizationId,
    record.courseId
  )
  if (!course?.statutoryFlag || !course.statutoryAuthorityCode) {
    return { evidenceId: null, created: false }
  }

  const [employee] = await db
    .select({ countryCode: hrmEmployee.countryCode })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, record.employeeId)
      )
    )
    .limit(1)

  const countryCode = employee?.countryCode?.trim().toUpperCase() || "XX"
  const periodKey = periodKeyFromDate(record.completedAt)
  const packType = `training.${course.statutoryAuthorityCode}.${periodKey}`

  const [existing] = await db
    .select({ id: hrmComplianceEvidence.id })
    .from(hrmComplianceEvidence)
    .where(
      and(
        eq(hrmComplianceEvidence.organizationId, input.organizationId),
        isNull(hrmComplianceEvidence.periodId),
        eq(hrmComplianceEvidence.countryCode, countryCode),
        eq(hrmComplianceEvidence.packType, packType)
      )
    )
    .limit(1)

  if (existing) {
    return { evidenceId: existing.id, created: false }
  }

  const inputHash = createHash("sha256")
    .update(`${record.id}:${record.employeeId}:${record.courseId}`)
    .digest("hex")
  const outputHash = createHash("sha256")
    .update(`${inputHash}:${record.certificateDocumentId ?? "none"}`)
    .digest("hex")

  const [inserted] = await db
    .insert(hrmComplianceEvidence)
    .values({
      organizationId: input.organizationId,
      periodId: null,
      countryCode,
      packType,
      inputHash,
      outputHash,
      payloadDocumentId: record.certificateDocumentId,
      rulePackVersion: `training-${course.code}-v1`,
      generatedByUserId: input.actorUserId,
      submissionState: "acknowledged",
      acknowledgedAt: new Date(),
      acknowledgedByUserId: input.actorUserId,
      acknowledgementSource: "api",
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
    .returning({ id: hrmComplianceEvidence.id })

  return { evidenceId: inserted?.id ?? null, created: true }
}
