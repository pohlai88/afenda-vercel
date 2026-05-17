import "server-only"

import { and, eq, inArray, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefitEnrollmentDependent, hrmDependent } from "#lib/db/schema"

import {
  isBenefitCoverageLevel,
  type BenefitCoverageLevel,
} from "./benefit-helpers.shared"

function coverageRequiresDependents(level: BenefitCoverageLevel): boolean {
  return level !== "employee_only"
}

export async function validateEnrollmentDependents(params: {
  readonly organizationId: string
  readonly employeeId: string
  readonly coverageLevel: string
  readonly dependentIds: readonly string[]
}): Promise<string | null> {
  if (
    !isBenefitCoverageLevel(params.coverageLevel) ||
    !coverageRequiresDependents(params.coverageLevel)
  ) {
    if (params.dependentIds.length > 0) {
      return "Dependents are only allowed for non employee-only coverage."
    }
    return null
  }

  if (params.dependentIds.length === 0) {
    return "Select at least one dependent for this coverage level."
  }

  const rows = await db
    .select({ id: hrmDependent.id })
    .from(hrmDependent)
    .where(
      and(
        eq(hrmDependent.organizationId, params.organizationId),
        eq(hrmDependent.employeeId, params.employeeId),
        isNull(hrmDependent.archivedAt),
        inArray(hrmDependent.id, [...params.dependentIds])
      )
    )

  if (rows.length !== params.dependentIds.length) {
    return "One or more dependents are invalid or archived."
  }

  return null
}

export async function replaceBenefitEnrollmentDependents(params: {
  readonly organizationId: string
  readonly enrollmentId: string
  readonly employeeId: string
  readonly dependentIds: readonly string[]
  readonly effectiveFrom: Date
  readonly effectiveTo?: Date | null
  readonly createdByUserId: string
}): Promise<void> {
  await db
    .delete(hrmBenefitEnrollmentDependent)
    .where(
      and(
        eq(hrmBenefitEnrollmentDependent.organizationId, params.organizationId),
        eq(hrmBenefitEnrollmentDependent.enrollmentId, params.enrollmentId)
      )
    )

  if (params.dependentIds.length === 0) return

  const dependents = await db
    .select({
      id: hrmDependent.id,
      relationship: hrmDependent.relationship,
    })
    .from(hrmDependent)
    .where(
      and(
        eq(hrmDependent.organizationId, params.organizationId),
        eq(hrmDependent.employeeId, params.employeeId),
        isNull(hrmDependent.archivedAt),
        inArray(hrmDependent.id, [...params.dependentIds])
      )
    )

  if (dependents.length === 0) return

  await db.insert(hrmBenefitEnrollmentDependent).values(
    dependents.map((dependent) => ({
      organizationId: params.organizationId,
      enrollmentId: params.enrollmentId,
      dependentId: dependent.id,
      relationship: dependent.relationship,
      effectiveFrom: params.effectiveFrom,
      effectiveTo: params.effectiveTo ?? null,
      isActive: true,
      createdByUserId: params.createdByUserId,
      updatedByUserId: params.createdByUserId,
    }))
  )
}
