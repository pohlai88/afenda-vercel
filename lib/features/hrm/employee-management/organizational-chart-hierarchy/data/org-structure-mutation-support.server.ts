import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPosition } from "#lib/db/schema"

import { isoDateOnlyToUtcDate } from "../../../hrm-calendar-dates.server"
import {
  buildOrgStructureFieldChanges,
  DEPARTMENT_CHANGE_FIELDS,
  POSITION_CHANGE_FIELDS,
} from "./org-structure-change-history.shared"
import { insertOrgStructureChangeHistoryRows } from "./org-structure-change-history.mutations.server"
import type { CreateOrgUnitFormInput } from "../schemas/org-unit.schema"
import type { CreatePositionControlFormInput } from "../schemas/position-control.schema"

export async function assertPositionAcceptsPlacement(
  organizationId: string,
  positionId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const [position] = await db
    .select({
      id: hrmPosition.id,
      archivedAt: hrmPosition.archivedAt,
      positionStatus: hrmPosition.positionStatus,
    })
    .from(hrmPosition)
    .where(
      and(
        eq(hrmPosition.organizationId, organizationId),
        eq(hrmPosition.id, positionId)
      )
    )
    .limit(1)

  if (!position || position.archivedAt) {
    return { ok: false, message: "Position is not active." }
  }
  if (position.positionStatus === "frozen") {
    return { ok: false, message: "Position is frozen and cannot accept placements." }
  }
  if (position.positionStatus === "closed") {
    return { ok: false, message: "Position is closed and cannot accept placements." }
  }
  return { ok: true }
}

export function departmentSnapshotFromParsed(parsed: CreateOrgUnitFormInput) {
  return {
    code: parsed.code,
    name: parsed.name,
    orgUnitType: parsed.orgUnitType,
    parentDepartmentId: parsed.parentDepartmentId,
    headEmployeeId: parsed.headEmployeeId,
    costCenterCode: parsed.costCenterCode ?? null,
    workLocationCode: parsed.workLocationCode ?? null,
    effectiveFrom: parsed.effectiveFrom
      ? isoDateOnlyToUtcDate(parsed.effectiveFrom)
      : null,
  }
}

export function positionSnapshotFromParsed(parsed: CreatePositionControlFormInput) {
  return {
    code: parsed.code,
    title: parsed.title,
    departmentId: parsed.departmentId,
    defaultGradeId: parsed.defaultGradeId,
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
