import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPosition, hrmPositionVersion } from "#lib/db/schema"

import { isoDateOnlyToUtcDate } from "../../../_module-governance/hrm-calendar-dates.server"
import {
  buildOrgStructureFieldChanges,
  DEPARTMENT_CHANGE_FIELDS,
  POSITION_CHANGE_FIELDS,
} from "./org-structure-change-history.shared"
import { insertOrgStructureChangeHistoryRows } from "./org-structure-change-history.mutations.server"
import { chooseEffectiveVersion } from "./org-structure-versioning.shared"
import type { CreateOrgUnitFormInput } from "../schemas/org-unit.schema"
import type { CreatePositionControlFormInput } from "../schemas/position-control.schema"

export async function assertPositionAcceptsPlacement(
  organizationId: string,
  positionId: string,
  asOfDate: Date = new Date()
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [positionRows, versions] = await Promise.all([
    db
      .select({
        id: hrmPosition.id,
        archivedAt: hrmPosition.archivedAt,
        positionStatus: hrmPosition.positionStatus,
        effectiveFrom: hrmPosition.effectiveFrom,
      })
      .from(hrmPosition)
      .where(
        and(
          eq(hrmPosition.organizationId, organizationId),
          eq(hrmPosition.id, positionId)
        )
      )
      .limit(1),
    db
      .select({
        positionStatus: hrmPositionVersion.positionStatus,
        effectiveFrom: hrmPositionVersion.effectiveFrom,
        effectiveTo: hrmPositionVersion.effectiveTo,
      })
      .from(hrmPositionVersion)
      .where(
        and(
          eq(hrmPositionVersion.organizationId, organizationId),
          eq(hrmPositionVersion.positionId, positionId)
        )
      ),
  ])
  const position = positionRows[0]

  if (!position || position.archivedAt) {
    return { ok: false, message: "Position is not active." }
  }
  const effectiveVersion = chooseEffectiveVersion(versions, asOfDate)
  const positionStatus =
    effectiveVersion?.positionStatus ?? position.positionStatus
  if (
    !effectiveVersion &&
    position.effectiveFrom &&
    position.effectiveFrom > asOfDate
  ) {
    return {
      ok: false,
      message: "Position is not effective for the placement date.",
    }
  }
  if (positionStatus === "planned") {
    return {
      ok: false,
      message: "Position is planned and cannot accept placements yet.",
    }
  }
  if (positionStatus === "frozen") {
    return {
      ok: false,
      message: "Position is frozen and cannot accept placements.",
    }
  }
  if (positionStatus === "closed") {
    return {
      ok: false,
      message: "Position is closed and cannot accept placements.",
    }
  }
  return { ok: true }
}

export function departmentSnapshotFromParsed(parsed: CreateOrgUnitFormInput) {
  return {
    code: parsed.code,
    name: parsed.name,
    orgUnitType: parsed.orgUnitType,
    orgUnitStatus: parsed.orgUnitStatus,
    parentDepartmentId: parsed.parentDepartmentId,
    headEmployeeId: parsed.headEmployeeId,
    costCenterCode: parsed.costCenterCode ?? null,
    workLocationCode: parsed.workLocationCode ?? null,
    effectiveFrom: parsed.effectiveFrom
      ? isoDateOnlyToUtcDate(parsed.effectiveFrom)
      : null,
  }
}

export function positionSnapshotFromParsed(
  parsed: CreatePositionControlFormInput
) {
  return {
    code: parsed.code,
    title: parsed.title,
    departmentId: parsed.departmentId,
    defaultGradeId: parsed.defaultGradeId,
    positionOwnerEmployeeId: parsed.positionOwnerEmployeeId,
    reportsToPositionId: parsed.reportsToPositionId,
    employmentType: parsed.employmentType,
    headcountBudget: parsed.headcountBudget ?? null,
    positionStatus: parsed.positionStatus,
    costCenterCode: parsed.costCenterCode ?? null,
    workLocationCode: parsed.workLocationCode ?? null,
    effectiveFrom: parsed.effectiveFrom
      ? isoDateOnlyToUtcDate(parsed.effectiveFrom)
      : null,
  }
}

export async function recordDepartmentChangeHistory(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    organizationId: string
    departmentId: string
    changedByUserId: string
    existing: Record<string, unknown> | null
    next: Record<string, unknown>
    effectiveDate?: Date | null
    reason?: string | null
    approvalReference?: string | null
  }
) {
  const changes = buildOrgStructureFieldChanges(
    input.existing,
    input.next,
    DEPARTMENT_CHANGE_FIELDS
  )
  await insertOrgStructureChangeHistoryRows(tx, {
    organizationId: input.organizationId,
    resourceType: "hrm_department",
    resourceId: input.departmentId,
    changedByUserId: input.changedByUserId,
    changes,
    effectiveDate: input.effectiveDate,
    reason: input.reason,
    approvalReference: input.approvalReference,
  })
  return changes
}

export async function recordPositionChangeHistory(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  input: {
    organizationId: string
    positionId: string
    changedByUserId: string
    existing: Record<string, unknown> | null
    next: Record<string, unknown>
    effectiveDate?: Date | null
    reason?: string | null
    approvalReference?: string | null
  }
) {
  const changes = buildOrgStructureFieldChanges(
    input.existing,
    input.next,
    POSITION_CHANGE_FIELDS
  )
  await insertOrgStructureChangeHistoryRows(tx, {
    organizationId: input.organizationId,
    resourceType: "hrm_position",
    resourceId: input.positionId,
    changedByUserId: input.changedByUserId,
    changes,
    effectiveDate: input.effectiveDate,
    reason: input.reason,
    approvalReference: input.approvalReference,
  })
  return changes
}
