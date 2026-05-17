import "server-only"

import { and, eq, isNull, lt } from "drizzle-orm"

import type { db } from "#lib/db"
import {
  hrmEmployeeReportingRelationship,
  hrmOrgStructureChangeHistory,
  hrmOrgUnitVersion,
  hrmPositionVersion,
} from "#lib/db/schema"

import {
  assertAppendOnlyEffectiveVersionWindow,
  startOfUtcDay,
} from "./org-structure-versioning.shared"
import type { HrmReportingRelationshipType } from "../schemas/employee-assignment.schema"

type OrgStructureDbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

function dayBefore(value: Date): Date {
  const day = startOfUtcDay(value)
  day.setUTCDate(day.getUTCDate() - 1)
  return day
}

export async function insertOrgUnitVersion(
  tx: OrgStructureDbTx,
  input: {
    readonly organizationId: string
    readonly orgUnitId: string
    readonly code: string
    readonly name: string
    readonly orgUnitType: string
    readonly parentOrgUnitId: string | null
    readonly managerEmployeeId: string | null
    readonly costCenterCode: string | null
    readonly workLocationCode: string | null
    readonly status: string
    readonly effectiveFrom: Date
    readonly reason?: string | null
    readonly approvalReference?: string | null
    readonly actorUserId: string
  }
): Promise<string> {
  const existingVersions = await tx
    .select({
      effectiveFrom: hrmOrgUnitVersion.effectiveFrom,
      effectiveTo: hrmOrgUnitVersion.effectiveTo,
    })
    .from(hrmOrgUnitVersion)
    .where(
      and(
        eq(hrmOrgUnitVersion.organizationId, input.organizationId),
        eq(hrmOrgUnitVersion.orgUnitId, input.orgUnitId)
      )
    )
  assertAppendOnlyEffectiveVersionWindow(
    existingVersions,
    input.effectiveFrom,
    {
      duplicateError: "org_unit_version_duplicate_effective_from",
      overlapError: "org_unit_version_overlaps_existing",
    }
  )

  await tx
    .update(hrmOrgUnitVersion)
    .set({
      effectiveTo: dayBefore(input.effectiveFrom),
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmOrgUnitVersion.organizationId, input.organizationId),
        eq(hrmOrgUnitVersion.orgUnitId, input.orgUnitId),
        isNull(hrmOrgUnitVersion.effectiveTo),
        lt(hrmOrgUnitVersion.effectiveFrom, input.effectiveFrom)
      )
    )

  const [inserted] = await tx
    .insert(hrmOrgUnitVersion)
    .values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      orgUnitId: input.orgUnitId,
      code: input.code,
      name: input.name,
      orgUnitType: input.orgUnitType,
      parentOrgUnitId: input.parentOrgUnitId,
      managerEmployeeId: input.managerEmployeeId,
      costCenterCode: input.costCenterCode,
      workLocationCode: input.workLocationCode,
      status: input.status,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: null,
      reason: input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
    .returning({ id: hrmOrgUnitVersion.id })

  if (!inserted) throw new Error("org_unit_version_insert_failed")
  return inserted.id
}

export async function insertPositionVersion(
  tx: OrgStructureDbTx,
  input: {
    readonly organizationId: string
    readonly positionId: string
    readonly code: string
    readonly title: string
    readonly orgUnitId: string
    readonly positionOwnerEmployeeId: string | null
    readonly reportsToPositionId: string | null
    readonly defaultGradeId: string | null
    readonly employmentType: string
    readonly headcountBudget: number | null
    readonly positionStatus: string
    readonly costCenterCode: string | null
    readonly workLocationCode: string | null
    readonly effectiveFrom: Date
    readonly reason?: string | null
    readonly approvalReference?: string | null
    readonly actorUserId: string
  }
): Promise<string> {
  const existingVersions = await tx
    .select({
      effectiveFrom: hrmPositionVersion.effectiveFrom,
      effectiveTo: hrmPositionVersion.effectiveTo,
    })
    .from(hrmPositionVersion)
    .where(
      and(
        eq(hrmPositionVersion.organizationId, input.organizationId),
        eq(hrmPositionVersion.positionId, input.positionId)
      )
    )
  assertAppendOnlyEffectiveVersionWindow(
    existingVersions,
    input.effectiveFrom,
    {
      duplicateError: "position_version_duplicate_effective_from",
      overlapError: "position_version_overlaps_existing",
    }
  )

  await tx
    .update(hrmPositionVersion)
    .set({
      effectiveTo: dayBefore(input.effectiveFrom),
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmPositionVersion.organizationId, input.organizationId),
        eq(hrmPositionVersion.positionId, input.positionId),
        isNull(hrmPositionVersion.effectiveTo),
        lt(hrmPositionVersion.effectiveFrom, input.effectiveFrom)
      )
    )

  const [inserted] = await tx
    .insert(hrmPositionVersion)
    .values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      positionId: input.positionId,
      code: input.code,
      title: input.title,
      orgUnitId: input.orgUnitId,
      positionOwnerEmployeeId: input.positionOwnerEmployeeId,
      reportsToPositionId: input.reportsToPositionId,
      defaultGradeId: input.defaultGradeId,
      employmentType: input.employmentType,
      headcountBudget: input.headcountBudget,
      positionStatus: input.positionStatus,
      costCenterCode: input.costCenterCode,
      workLocationCode: input.workLocationCode,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: null,
      reason: input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
    .returning({ id: hrmPositionVersion.id })

  if (!inserted) throw new Error("position_version_insert_failed")
  return inserted.id
}

export async function insertEmployeeReportingRelationshipVersion(
  tx: OrgStructureDbTx,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly managerEmployeeId: string
    readonly relationshipType: HrmReportingRelationshipType
    readonly effectiveFrom: Date
    readonly effectiveTo?: Date | null
    readonly status: string
    readonly reason?: string | null
    readonly approvalReference?: string | null
    readonly actorUserId: string
  }
): Promise<string> {
  const relationshipWindowWhere =
    input.relationshipType === "matrix"
      ? and(
          eq(
            hrmEmployeeReportingRelationship.organizationId,
            input.organizationId
          ),
          eq(hrmEmployeeReportingRelationship.employeeId, input.employeeId),
          eq(
            hrmEmployeeReportingRelationship.relationshipType,
            input.relationshipType
          ),
          eq(
            hrmEmployeeReportingRelationship.managerEmployeeId,
            input.managerEmployeeId
          )
        )
      : and(
          eq(
            hrmEmployeeReportingRelationship.organizationId,
            input.organizationId
          ),
          eq(hrmEmployeeReportingRelationship.employeeId, input.employeeId),
          eq(
            hrmEmployeeReportingRelationship.relationshipType,
            input.relationshipType
          )
        )
  const existingVersions = await tx
    .select({
      effectiveFrom: hrmEmployeeReportingRelationship.effectiveFrom,
      effectiveTo: hrmEmployeeReportingRelationship.effectiveTo,
    })
    .from(hrmEmployeeReportingRelationship)
    .where(relationshipWindowWhere)
  assertAppendOnlyEffectiveVersionWindow(
    existingVersions,
    input.effectiveFrom,
    {
      duplicateError: "reporting_relationship_duplicate_effective_from",
      overlapError: "reporting_relationship_overlaps_existing",
    }
  )

  if (input.relationshipType !== "matrix") {
    await tx
      .update(hrmEmployeeReportingRelationship)
      .set({
        effectiveTo: dayBefore(input.effectiveFrom),
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(
            hrmEmployeeReportingRelationship.organizationId,
            input.organizationId
          ),
          eq(hrmEmployeeReportingRelationship.employeeId, input.employeeId),
          eq(
            hrmEmployeeReportingRelationship.relationshipType,
            input.relationshipType
          ),
          isNull(hrmEmployeeReportingRelationship.effectiveTo),
          lt(
            hrmEmployeeReportingRelationship.effectiveFrom,
            input.effectiveFrom
          )
        )
      )
  }

  const [inserted] = await tx
    .insert(hrmEmployeeReportingRelationship)
    .values({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      managerEmployeeId: input.managerEmployeeId,
      relationshipType: input.relationshipType,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo ?? null,
      status: input.status,
      reason: input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
    .returning({ id: hrmEmployeeReportingRelationship.id })

  if (!inserted) throw new Error("reporting_relationship_insert_failed")
  return inserted.id
}

export async function recordOrgStructureHistoryRows(
  tx: OrgStructureDbTx,
  input: {
    readonly organizationId: string
    readonly resourceType:
      | "hrm_employee_assignment"
      | "hrm_employee_reporting_relationship"
    readonly resourceId: string
    readonly changedByUserId: string
    readonly changes: readonly {
      readonly fieldName: string
      readonly oldValue: unknown
      readonly newValue: unknown
    }[]
    readonly effectiveDate?: Date | null
    readonly reason?: string | null
    readonly approvalReference?: string | null
  }
): Promise<void> {
  if (input.changes.length === 0) return
  await tx.insert(hrmOrgStructureChangeHistory).values(
    input.changes.map((change) => ({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      fieldName: change.fieldName,
      oldValue: change.oldValue === undefined ? null : change.oldValue,
      newValue: change.newValue === undefined ? null : change.newValue,
      changedByUserId: input.changedByUserId,
      effectiveDate: input.effectiveDate ?? null,
      reason: input.reason ?? null,
      approvalReference: input.approvalReference ?? null,
    }))
  )
}
