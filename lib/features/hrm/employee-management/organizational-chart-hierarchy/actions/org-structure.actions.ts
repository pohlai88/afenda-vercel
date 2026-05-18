"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq, isNull } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { ORG_APPS_HRM_ORGANIZATION } from "#lib/org-apps-module-paths"
import { db } from "#lib/db"
import {
  hrmDepartment,
  hrmEmployee,
  hrmEmployeeReportingRelationship,
  hrmJobGrade,
  hrmOrgUnitVersion,
  hrmPosition,
  hrmPositionVersion,
} from "#lib/db/schema"
import {
  toLocaleOrgAppsRevalidatePattern,
  toLocaleOrgNexusRevalidatePattern,
} from "#lib/i18n/locales.shared"

import { isoDateOnlyToUtcDate } from "../../../_module-governance/hrm-calendar-dates.server"
import { requireOrgStructureMutationGate } from "../data/org-structure-action-guard.server"
import { HRM_ORG_STRUCTURE_AUDIT } from "../org-structure.contract"
import { assertOptionalHrmPlacementFkBelongsToOrg } from "../../../_internal-cross-cutting/hrm-org-fk.server"
import {
  countActivePositionsInDepartment,
  countEmployeesUsingDepartment,
  countEmployeesUsingGrade,
  countEmployeesUsingPosition,
  countPositionsUsingDefaultGrade,
} from "../data/org-structure.queries.server"
import {
  archiveDepartmentFormSchema,
  archiveJobGradeFormSchema,
  archivePositionFormSchema,
  assignEmployeeOrganizationPlacementFormSchema,
  createDepartmentFormSchema,
  createJobGradeFormSchema,
  createPositionFormSchema,
  setEmployeeReportingFormSchema,
  setPositionReportsToFormSchema,
  updateDepartmentFormSchema,
  updateJobGradeFormSchema,
  updatePositionFormSchema,
} from "../schemas/org-structure.schema"
import { buildOrgStructureAuditMetadata } from "../data/org-structure-audit-metadata.shared"
import {
  buildOrgStructureFieldChanges,
  DEPARTMENT_CHANGE_FIELDS,
  EMPLOYEE_PLACEMENT_CHANGE_FIELDS,
  POSITION_CHANGE_FIELDS,
  REPORTING_RELATIONSHIP_CHANGE_FIELDS,
} from "../data/org-structure-change-history.shared"
import {
  assertPositionAcceptsPlacement,
  departmentSnapshotFromParsed,
  positionSnapshotFromParsed,
  recordDepartmentChangeHistory,
  recordPositionChangeHistory,
} from "../data/org-structure-mutation-support.server"
import { upsertEmployeeEffectiveAssignment } from "../../employee-records-management/data/employee-assignment-command.server"
import {
  insertEmployeeReportingRelationshipVersion,
  insertOrgUnitVersion,
  insertPositionVersion,
  recordOrgStructureHistoryRows,
} from "../data/org-structure-versioning.server"
import {
  chooseEffectiveVersion,
  isFutureEffectiveDate,
} from "../data/org-structure-versioning.shared"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { OrgStructureFormState } from "../../../types"

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "23505"
  )
}

function errorCode(err: unknown): string | null {
  return err instanceof Error ? err.message : null
}

function effectiveDateFromOptionalIso(value: string | undefined): Date {
  return value ? isoDateOnlyToUtcDate(value) : new Date()
}

function shouldApplyProjection(effectiveFrom: Date): boolean {
  return !isFutureEffectiveDate(effectiveFrom)
}

function revalidateOrganizationSurface() {
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern(ORG_APPS_HRM_ORGANIZATION),
    "page"
  )
  revalidatePath(
    toLocaleOrgAppsRevalidatePattern("/hrm/employees"),
    "page"
  )
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/payroll"), "page")
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/snapshot"), "page")
  revalidatePath(toLocaleOrgNexusRevalidatePattern(), "page")
}

async function getActiveDepartment(
  organizationId: string,
  departmentId: string
) {
  return db.query.hrmDepartment.findFirst({
    where: and(
      eq(hrmDepartment.id, departmentId),
      eq(hrmDepartment.organizationId, organizationId),
      isNull(hrmDepartment.archivedAt)
    ),
  })
}

async function getActivePosition(organizationId: string, positionId: string) {
  const [row] = await db
    .select({
      id: hrmPosition.id,
      code: hrmPosition.code,
      title: hrmPosition.title,
      departmentId: hrmPosition.departmentId,
      defaultGradeId: hrmPosition.defaultGradeId,
      positionOwnerEmployeeId: hrmPosition.positionOwnerEmployeeId,
      reportsToPositionId: hrmPosition.reportsToPositionId,
      employmentType: hrmPosition.employmentType,
      headcountBudget: hrmPosition.headcountBudget,
      positionStatus: hrmPosition.positionStatus,
      costCenterCode: hrmPosition.costCenterCode,
      workLocationCode: hrmPosition.workLocationCode,
      effectiveFrom: hrmPosition.effectiveFrom,
      archivedAt: hrmPosition.archivedAt,
    })
    .from(hrmPosition)
    .where(
      and(
        eq(hrmPosition.id, positionId),
        eq(hrmPosition.organizationId, organizationId),
        isNull(hrmPosition.archivedAt)
      )
    )
    .limit(1)
  return row
}

async function getActiveJobGrade(organizationId: string, gradeId: string) {
  return db.query.hrmJobGrade.findFirst({
    where: and(
      eq(hrmJobGrade.id, gradeId),
      eq(hrmJobGrade.organizationId, organizationId),
      isNull(hrmJobGrade.archivedAt)
    ),
  })
}

async function getActiveEmployee(organizationId: string, employeeId: string) {
  return db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.id, employeeId),
      eq(hrmEmployee.organizationId, organizationId),
      isNull(hrmEmployee.archivedAt)
    ),
  })
}

async function countActiveChildDepartments(
  organizationId: string,
  departmentId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmDepartment.id })
    .from(hrmDepartment)
    .where(
      and(
        eq(hrmDepartment.organizationId, organizationId),
        eq(hrmDepartment.parentDepartmentId, departmentId),
        isNull(hrmDepartment.archivedAt)
      )
    )
  return rows.length
}

async function countActiveReportingPositions(
  organizationId: string,
  positionId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmPosition.id })
    .from(hrmPosition)
    .where(
      and(
        eq(hrmPosition.organizationId, organizationId),
        eq(hrmPosition.reportsToPositionId, positionId),
        isNull(hrmPosition.archivedAt)
      )
    )
  return rows.length
}

async function departmentHierarchyError(
  organizationId: string,
  departmentId: string,
  parentDepartmentId: string | null,
  asOfDate: Date
): Promise<string | null> {
  if (!parentDepartmentId) return null
  if (departmentId === parentDepartmentId) {
    return "An org unit cannot parent itself."
  }

  const [departments, versions] = await Promise.all([
    db
      .select({
        id: hrmDepartment.id,
        parentDepartmentId: hrmDepartment.parentDepartmentId,
      })
      .from(hrmDepartment)
      .where(eq(hrmDepartment.organizationId, organizationId)),
    db
      .select({
        orgUnitId: hrmOrgUnitVersion.orgUnitId,
        parentDepartmentId: hrmOrgUnitVersion.parentOrgUnitId,
        status: hrmOrgUnitVersion.status,
        effectiveFrom: hrmOrgUnitVersion.effectiveFrom,
        effectiveTo: hrmOrgUnitVersion.effectiveTo,
      })
      .from(hrmOrgUnitVersion)
      .where(eq(hrmOrgUnitVersion.organizationId, organizationId)),
  ])

  const parentMap = new Map(
    departments.map((row) => [row.id, row.parentDepartmentId])
  )
  const versionsByUnit = new Map<string, typeof versions>()
  for (const version of versions) {
    const list = versionsByUnit.get(version.orgUnitId) ?? []
    list.push(version)
    versionsByUnit.set(version.orgUnitId, list)
  }
  for (const [orgUnitId, unitVersions] of versionsByUnit) {
    const effective = chooseEffectiveVersion(unitVersions, asOfDate)
    if (!effective) continue
    parentMap.set(
      orgUnitId,
      effective.status === "closed" ? null : effective.parentDepartmentId
    )
  }
  parentMap.set(departmentId, parentDepartmentId)

  const visited = new Set<string>()
  let cursor: string | null | undefined = parentDepartmentId
  while (cursor) {
    if (cursor === departmentId) {
      return "Parent org unit would create a hierarchy cycle."
    }
    if (visited.has(cursor)) {
      return "Existing org unit hierarchy cycle must be resolved first."
    }
    visited.add(cursor)
    cursor = parentMap.get(cursor)
  }
  return null
}

async function positionReportingError(
  organizationId: string,
  positionId: string,
  reportsToPositionId: string | null,
  asOfDate: Date
): Promise<string | null> {
  if (!reportsToPositionId) return null
  if (positionId === reportsToPositionId) {
    return "A position cannot report to itself."
  }

  const [positions, versions] = await Promise.all([
    db
      .select({
        id: hrmPosition.id,
        reportsToPositionId: hrmPosition.reportsToPositionId,
      })
      .from(hrmPosition)
      .where(eq(hrmPosition.organizationId, organizationId)),
    db
      .select({
        positionId: hrmPositionVersion.positionId,
        reportsToPositionId: hrmPositionVersion.reportsToPositionId,
        positionStatus: hrmPositionVersion.positionStatus,
        effectiveFrom: hrmPositionVersion.effectiveFrom,
        effectiveTo: hrmPositionVersion.effectiveTo,
      })
      .from(hrmPositionVersion)
      .where(eq(hrmPositionVersion.organizationId, organizationId)),
  ])

  const reportsToMap = new Map(
    positions.map((row) => [row.id, row.reportsToPositionId])
  )
  const versionsByPosition = new Map<string, typeof versions>()
  for (const version of versions) {
    const list = versionsByPosition.get(version.positionId) ?? []
    list.push(version)
    versionsByPosition.set(version.positionId, list)
  }
  for (const [versionPositionId, positionVersions] of versionsByPosition) {
    const effective = chooseEffectiveVersion(positionVersions, asOfDate)
    if (!effective) continue
    reportsToMap.set(
      versionPositionId,
      effective.positionStatus === "closed"
        ? null
        : effective.reportsToPositionId
    )
  }
  reportsToMap.set(positionId, reportsToPositionId)

  const visited = new Set<string>()
  let cursor: string | null | undefined = reportsToPositionId
  while (cursor) {
    if (cursor === positionId) {
      return "Reports-to position would create a reporting cycle."
    }
    if (visited.has(cursor)) {
      return "Existing position reporting cycle must be resolved first."
    }
    visited.add(cursor)
    cursor = reportsToMap.get(cursor)
  }
  return null
}

async function employeeManagerCycleError(
  organizationId: string,
  employeeId: string,
  managerEmployeeId: string | null,
  asOfDate: Date = new Date()
): Promise<string | null> {
  if (!managerEmployeeId) return null
  if (employeeId === managerEmployeeId) {
    return "An employee cannot manage themselves."
  }

  const [employees, directRelationshipVersions] = await Promise.all([
    db
      .select({
        id: hrmEmployee.id,
        managerEmployeeId: hrmEmployee.managerEmployeeId,
      })
      .from(hrmEmployee)
      .where(eq(hrmEmployee.organizationId, organizationId)),
    db
      .select({
        employeeId: hrmEmployeeReportingRelationship.employeeId,
        managerEmployeeId: hrmEmployeeReportingRelationship.managerEmployeeId,
        effectiveFrom: hrmEmployeeReportingRelationship.effectiveFrom,
        effectiveTo: hrmEmployeeReportingRelationship.effectiveTo,
        status: hrmEmployeeReportingRelationship.status,
      })
      .from(hrmEmployeeReportingRelationship)
      .where(
        and(
          eq(hrmEmployeeReportingRelationship.organizationId, organizationId),
          eq(hrmEmployeeReportingRelationship.relationshipType, "direct")
        )
      ),
  ])

  const managerMap = new Map(
    employees.map((row) => [row.id, row.managerEmployeeId])
  )
  const versionsByEmployee = new Map<
    string,
    typeof directRelationshipVersions
  >()
  for (const row of directRelationshipVersions) {
    const versions = versionsByEmployee.get(row.employeeId) ?? []
    versions.push(row)
    versionsByEmployee.set(row.employeeId, versions)
  }
  for (const [versionEmployeeId, versions] of versionsByEmployee) {
    const effective = chooseEffectiveVersion(versions, asOfDate)
    if (!effective) continue
    managerMap.set(
      versionEmployeeId,
      effective.status === "active" ? effective.managerEmployeeId : null
    )
  }
  managerMap.set(employeeId, managerEmployeeId)

  const visited = new Set<string>()
  let cursor: string | null | undefined = managerEmployeeId
  while (cursor) {
    if (cursor === employeeId) {
      return "Direct manager assignment would create a reporting cycle."
    }
    if (visited.has(cursor)) {
      return "Existing employee reporting cycle must be resolved first."
    }
    visited.add(cursor)
    cursor = managerMap.get(cursor)
  }
  return null
}

async function assertActivePlacementReferences(
  organizationId: string,
  input: {
    departmentId?: string | null
    positionId?: string | null
    gradeId?: string | null
    effectiveFrom?: Date
  }
): Promise<{ ok: true } | { ok: false; message: string }> {
  const fk = await assertOptionalHrmPlacementFkBelongsToOrg(
    organizationId,
    input
  )
  if (!fk.ok) return fk

  if (
    input.departmentId &&
    !(await getActiveDepartment(organizationId, input.departmentId))
  ) {
    return { ok: false, message: "Department is not active." }
  }
  if (input.positionId) {
    const placement = await assertPositionAcceptsPlacement(
      organizationId,
      input.positionId,
      input.effectiveFrom
    )
    if (!placement.ok) return placement
  }
  if (
    input.gradeId &&
    !(await getActiveJobGrade(organizationId, input.gradeId))
  ) {
    return { ok: false, message: "Job grade is not active." }
  }
  return { ok: true }
}

export async function createDepartmentAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = createDepartmentFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    code: formString(formData, "code"),
    name: formString(formData, "name"),
    orgUnitType: formString(formData, "orgUnitType") || undefined,
    orgUnitStatus: formString(formData, "orgUnitStatus") || undefined,
    parentDepartmentId: formString(formData, "parentDepartmentId"),
    headEmployeeId: formString(formData, "headEmployeeId"),
    costCenterCode: formString(formData, "costCenterCode"),
    workLocationCode: formString(formData, "workLocationCode"),
    effectiveFrom: formString(formData, "effectiveFrom"),
    reason: formString(formData, "reason"),
    approvalReference: formString(formData, "approvalReference"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
      form:
        fe.orgSlug?.[0] ??
        fe.parentDepartmentId?.[0] ??
        fe.headEmployeeId?.[0] ??
        fe.costCenterCode?.[0],
    })
  }

  if (
    parsed.data.parentDepartmentId &&
    !(await getActiveDepartment(organizationId, parsed.data.parentDepartmentId))
  ) {
    return hrmActionFailure({ form: "Parent org unit not found." })
  }
  if (
    parsed.data.headEmployeeId &&
    !(await getActiveEmployee(organizationId, parsed.data.headEmployeeId))
  ) {
    return hrmActionFailure({ form: "Org unit head is not active." })
  }

  const nextSnapshot = departmentSnapshotFromParsed(parsed.data)
  const effectiveFrom = effectiveDateFromOptionalIso(parsed.data.effectiveFrom)
  const applyProjection = shouldApplyProjection(effectiveFrom)
  let row: { id: string } | undefined
  try {
    row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(hrmDepartment)
        .values({
          organizationId,
          ...nextSnapshot,
          effectiveFrom,
          createdByUserId: userId,
          updatedByUserId: userId,
        })
        .returning({ id: hrmDepartment.id })
      if (!inserted) throw new Error("department_insert_failed")
      await insertOrgUnitVersion(tx, {
        organizationId,
        orgUnitId: inserted.id,
        code: nextSnapshot.code,
        name: nextSnapshot.name,
        orgUnitType: nextSnapshot.orgUnitType,
        parentOrgUnitId: nextSnapshot.parentDepartmentId,
        managerEmployeeId: nextSnapshot.headEmployeeId,
        costCenterCode: nextSnapshot.costCenterCode,
        workLocationCode: nextSnapshot.workLocationCode,
        status: nextSnapshot.orgUnitStatus,
        effectiveFrom,
        reason: parsed.data.reason,
        approvalReference: parsed.data.approvalReference,
        actorUserId: userId,
      })
      if (!applyProjection) {
        await tx
          .update(hrmDepartment)
          .set({
            orgUnitStatus: "planned",
            updatedAt: new Date(),
            updatedByUserId: userId,
          })
          .where(eq(hrmDepartment.id, inserted.id))
      }
      await recordDepartmentChangeHistory(tx, {
        organizationId,
        departmentId: inserted.id,
        changedByUserId: userId,
        existing: null,
        next: nextSnapshot,
        effectiveDate: effectiveFrom,
        reason: parsed.data.reason,
        approvalReference: parsed.data.approvalReference,
      })
      return inserted
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "Department code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not create department." })
  }
  if (!row) return hrmActionFailure({ form: "Could not create department." })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.orgUnit.create,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_department",
      resourceId: row.id,
      metadata: buildOrgStructureAuditMetadata({
        code: parsed.data.code,
        approvalReference: parsed.data.approvalReference,
        changes: buildOrgStructureFieldChanges(
          null,
          nextSnapshot,
          DEPARTMENT_CHANGE_FIELDS
        ),
      }),
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export const createOrgUnitAction = createDepartmentAction

export async function updateOrgUnitAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = updateDepartmentFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    departmentId: formString(formData, "departmentId"),
    code: formString(formData, "code"),
    name: formString(formData, "name"),
    orgUnitType: formString(formData, "orgUnitType") || undefined,
    orgUnitStatus: formString(formData, "orgUnitStatus") || undefined,
    parentDepartmentId: formString(formData, "parentDepartmentId"),
    headEmployeeId: formString(formData, "headEmployeeId"),
    costCenterCode: formString(formData, "costCenterCode"),
    workLocationCode: formString(formData, "workLocationCode"),
    effectiveFrom: formString(formData, "effectiveFrom"),
    reason: formString(formData, "reason"),
    approvalReference: formString(formData, "approvalReference"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
      departmentId: fe.departmentId?.[0],
      form:
        fe.orgSlug?.[0] ??
        fe.parentDepartmentId?.[0] ??
        fe.headEmployeeId?.[0] ??
        fe.costCenterCode?.[0],
    })
  }

  const existing = await getActiveDepartment(
    organizationId,
    parsed.data.departmentId
  )
  if (!existing) return hrmActionFailure({ form: "Org unit not found." })

  if (
    parsed.data.parentDepartmentId &&
    !(await getActiveDepartment(organizationId, parsed.data.parentDepartmentId))
  ) {
    return hrmActionFailure({ form: "Parent org unit not found." })
  }
  if (
    parsed.data.headEmployeeId &&
    !(await getActiveEmployee(organizationId, parsed.data.headEmployeeId))
  ) {
    return hrmActionFailure({ form: "Org unit head is not active." })
  }

  const effectiveFrom = effectiveDateFromOptionalIso(parsed.data.effectiveFrom)
  const hierarchyError = await departmentHierarchyError(
    organizationId,
    parsed.data.departmentId,
    parsed.data.parentDepartmentId,
    effectiveFrom
  )
  if (hierarchyError) return hrmActionFailure({ form: hierarchyError })

  const existingSnapshot = {
    code: existing.code,
    name: existing.name,
    orgUnitType: existing.orgUnitType,
    orgUnitStatus: existing.orgUnitStatus,
    parentDepartmentId: existing.parentDepartmentId,
    headEmployeeId: existing.headEmployeeId,
    costCenterCode: existing.costCenterCode,
    workLocationCode: existing.workLocationCode,
    effectiveFrom: existing.effectiveFrom,
  }
  const nextSnapshot = departmentSnapshotFromParsed(parsed.data)
  const applyProjection = shouldApplyProjection(effectiveFrom)
  let changes: ReturnType<typeof buildOrgStructureFieldChanges> = []
  try {
    changes = await db.transaction(async (tx) => {
      if (applyProjection) {
        await tx
          .update(hrmDepartment)
          .set({
            ...nextSnapshot,
            effectiveFrom,
            updatedAt: new Date(),
            updatedByUserId: userId,
          })
          .where(
            and(
              eq(hrmDepartment.id, parsed.data.departmentId),
              eq(hrmDepartment.organizationId, organizationId),
              isNull(hrmDepartment.archivedAt)
            )
          )
      }
      await insertOrgUnitVersion(tx, {
        organizationId,
        orgUnitId: parsed.data.departmentId,
        code: nextSnapshot.code,
        name: nextSnapshot.name,
        orgUnitType: nextSnapshot.orgUnitType,
        parentOrgUnitId: nextSnapshot.parentDepartmentId,
        managerEmployeeId: nextSnapshot.headEmployeeId,
        costCenterCode: nextSnapshot.costCenterCode,
        workLocationCode: nextSnapshot.workLocationCode,
        status: nextSnapshot.orgUnitStatus,
        effectiveFrom,
        reason: parsed.data.reason,
        approvalReference: parsed.data.approvalReference,
        actorUserId: userId,
      })
      return recordDepartmentChangeHistory(tx, {
        organizationId,
        departmentId: parsed.data.departmentId,
        changedByUserId: userId,
        existing: existingSnapshot,
        next: nextSnapshot,
        effectiveDate: effectiveFrom,
        reason: parsed.data.reason,
        approvalReference: parsed.data.approvalReference,
      })
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "Department code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not update org unit." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.orgUnit.update,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_department",
      resourceId: parsed.data.departmentId,
      metadata: buildOrgStructureAuditMetadata({
        code: parsed.data.code,
        previousCode: existing.code,
        approvalReference: parsed.data.approvalReference,
        changes,
      }),
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function archiveDepartmentAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "delete")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = archiveDepartmentFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    departmentId: formString(formData, "departmentId"),
    effectiveFrom: formString(formData, "effectiveFrom"),
    reason: formString(formData, "reason"),
    approvalReference: formString(formData, "approvalReference"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid request." })
  }

  const existing = await db.query.hrmDepartment.findFirst({
    where: and(
      eq(hrmDepartment.id, parsed.data.departmentId),
      eq(hrmDepartment.organizationId, organizationId)
    ),
  })
  if (!existing || existing.archivedAt) {
    return hrmActionFailure({
      form: "Department not found or already archived.",
    })
  }

  const [nChild, nPos, nEmp] = await Promise.all([
    countActiveChildDepartments(organizationId, parsed.data.departmentId),
    countActivePositionsInDepartment(organizationId, parsed.data.departmentId),
    countEmployeesUsingDepartment(organizationId, parsed.data.departmentId),
  ])
  if (nChild > 0) {
    return hrmActionFailure({
      form: "Archive or re-parent child org units first.",
    })
  }
  if (nPos > 0) {
    return hrmActionFailure({
      form: "Archive positions in this org unit first, or reassign them.",
    })
  }
  if (nEmp > 0) {
    return hrmActionFailure({
      form: "Employees still reference this org unit.",
    })
  }

  const effectiveFrom = effectiveDateFromOptionalIso(parsed.data.effectiveFrom)
  const applyProjection = shouldApplyProjection(effectiveFrom)
  const now = new Date()
  await db.transaction(async (tx) => {
    await insertOrgUnitVersion(tx, {
      organizationId,
      orgUnitId: parsed.data.departmentId,
      code: existing.code,
      name: existing.name,
      orgUnitType: existing.orgUnitType,
      parentOrgUnitId: existing.parentDepartmentId,
      managerEmployeeId: existing.headEmployeeId,
      costCenterCode: existing.costCenterCode,
      workLocationCode: existing.workLocationCode,
      status: "closed",
      effectiveFrom,
      reason: parsed.data.reason,
      approvalReference: parsed.data.approvalReference,
      actorUserId: userId,
    })
    await recordDepartmentChangeHistory(tx, {
      organizationId,
      departmentId: parsed.data.departmentId,
      changedByUserId: userId,
      existing: {
        code: existing.code,
        name: existing.name,
        orgUnitType: existing.orgUnitType,
        orgUnitStatus: existing.orgUnitStatus,
        parentDepartmentId: existing.parentDepartmentId,
        headEmployeeId: existing.headEmployeeId,
        costCenterCode: existing.costCenterCode,
        workLocationCode: existing.workLocationCode,
        effectiveFrom: existing.effectiveFrom,
      },
      next: {
        code: existing.code,
        name: existing.name,
        orgUnitType: existing.orgUnitType,
        orgUnitStatus: "closed",
        parentDepartmentId: existing.parentDepartmentId,
        headEmployeeId: existing.headEmployeeId,
        costCenterCode: existing.costCenterCode,
        workLocationCode: existing.workLocationCode,
        effectiveFrom,
      },
      effectiveDate: effectiveFrom,
      reason: parsed.data.reason,
      approvalReference: parsed.data.approvalReference,
    })
    if (applyProjection) {
      await tx
        .update(hrmDepartment)
        .set({
          orgUnitStatus: "closed",
          archivedAt: now,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(
          and(
            eq(hrmDepartment.id, parsed.data.departmentId),
            eq(hrmDepartment.organizationId, organizationId)
          )
        )
    }
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.orgUnit.deprecate,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_department",
      resourceId: parsed.data.departmentId,
      metadata: {
        code: existing.code,
        approvalReference: parsed.data.approvalReference,
      },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export const archiveOrgUnitAction = archiveDepartmentAction

export async function createJobGradeAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = createJobGradeFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    code: formString(formData, "code"),
    name: formString(formData, "name"),
    ordinal: formString(formData, "ordinal"),
    minSalaryAmount: formString(formData, "minSalaryAmount"),
    maxSalaryAmount: formString(formData, "maxSalaryAmount"),
    currency: formString(formData, "currency") || undefined,
    benefitTierCode: formString(formData, "benefitTierCode"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
      form:
        fe.orgSlug?.[0] ??
        fe.ordinal?.[0] ??
        fe.minSalaryAmount?.[0] ??
        fe.maxSalaryAmount?.[0] ??
        fe.currency?.[0] ??
        fe.benefitTierCode?.[0],
    })
  }

  let row: { id: string } | undefined
  try {
    ;[row] = await db
      .insert(hrmJobGrade)
      .values({
        organizationId,
        code: parsed.data.code,
        name: parsed.data.name,
        ordinal: parsed.data.ordinal,
        minSalaryAmount: parsed.data.minSalaryAmount ?? null,
        maxSalaryAmount: parsed.data.maxSalaryAmount ?? null,
        currency: parsed.data.currency,
        benefitTierCode: parsed.data.benefitTierCode ?? null,
        createdByUserId: userId,
        updatedByUserId: userId,
      })
      .returning({ id: hrmJobGrade.id })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "Job grade code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not create job grade." })
  }
  if (!row) return hrmActionFailure({ form: "Could not create job grade." })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.jobGrade.create,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_job_grade",
      resourceId: row.id,
      metadata: { code: parsed.data.code },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function updateJobGradeAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = updateJobGradeFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    gradeId: formString(formData, "gradeId"),
    code: formString(formData, "code"),
    name: formString(formData, "name"),
    ordinal: formString(formData, "ordinal"),
    minSalaryAmount: formString(formData, "minSalaryAmount"),
    maxSalaryAmount: formString(formData, "maxSalaryAmount"),
    currency: formString(formData, "currency") || undefined,
    benefitTierCode: formString(formData, "benefitTierCode"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      name: fe.name?.[0],
      gradeId: fe.gradeId?.[0],
      form:
        fe.orgSlug?.[0] ??
        fe.ordinal?.[0] ??
        fe.minSalaryAmount?.[0] ??
        fe.maxSalaryAmount?.[0] ??
        fe.currency?.[0] ??
        fe.benefitTierCode?.[0],
    })
  }

  const existing = await getActiveJobGrade(organizationId, parsed.data.gradeId)
  if (!existing) return hrmActionFailure({ form: "Job grade not found." })

  try {
    await db
      .update(hrmJobGrade)
      .set({
        code: parsed.data.code,
        name: parsed.data.name,
        ordinal: parsed.data.ordinal,
        minSalaryAmount: parsed.data.minSalaryAmount ?? null,
        maxSalaryAmount: parsed.data.maxSalaryAmount ?? null,
        currency: parsed.data.currency,
        benefitTierCode: parsed.data.benefitTierCode ?? null,
        updatedAt: new Date(),
        updatedByUserId: userId,
      })
      .where(
        and(
          eq(hrmJobGrade.id, parsed.data.gradeId),
          eq(hrmJobGrade.organizationId, organizationId),
          isNull(hrmJobGrade.archivedAt)
        )
      )
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "Job grade code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not update job grade." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.jobGrade.update,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_job_grade",
      resourceId: parsed.data.gradeId,
      metadata: { code: parsed.data.code, previousCode: existing.code },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function archiveJobGradeAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "delete")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = archiveJobGradeFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    gradeId: formString(formData, "gradeId"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid request." })
  }

  const existing = await db.query.hrmJobGrade.findFirst({
    where: and(
      eq(hrmJobGrade.id, parsed.data.gradeId),
      eq(hrmJobGrade.organizationId, organizationId)
    ),
  })
  if (!existing || existing.archivedAt) {
    return hrmActionFailure({
      form: "Job grade not found or already archived.",
    })
  }

  const [nEmp, nPos] = await Promise.all([
    countEmployeesUsingGrade(organizationId, parsed.data.gradeId),
    countPositionsUsingDefaultGrade(organizationId, parsed.data.gradeId),
  ])
  if (nEmp > 0 || nPos > 0) {
    return hrmActionFailure({
      form: "Employees or positions still reference this job grade.",
    })
  }

  const now = new Date()
  await db
    .update(hrmJobGrade)
    .set({
      archivedAt: now,
      updatedAt: now,
      updatedByUserId: userId,
    })
    .where(
      and(
        eq(hrmJobGrade.id, parsed.data.gradeId),
        eq(hrmJobGrade.organizationId, organizationId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.jobGrade.deprecate,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_job_grade",
      resourceId: parsed.data.gradeId,
      metadata: { code: existing.code },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function createPositionAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "create")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = createPositionFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    code: formString(formData, "code"),
    title: formString(formData, "title"),
    departmentId: formString(formData, "departmentId"),
    defaultGradeId: formString(formData, "defaultGradeId"),
    positionOwnerEmployeeId: formString(formData, "positionOwnerEmployeeId"),
    reportsToPositionId: formString(formData, "reportsToPositionId"),
    employmentType: formString(formData, "employmentType") || undefined,
    headcountBudget: formString(formData, "headcountBudget"),
    positionStatus: formString(formData, "positionStatus") || undefined,
    costCenterCode: formString(formData, "costCenterCode"),
    workLocationCode: formString(formData, "workLocationCode"),
    effectiveFrom: formString(formData, "effectiveFrom"),
    reason: formString(formData, "reason"),
    approvalReference: formString(formData, "approvalReference"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      title: fe.title?.[0],
      departmentId: fe.departmentId?.[0],
      form:
        fe.orgSlug?.[0] ??
        fe.defaultGradeId?.[0] ??
        fe.reportsToPositionId?.[0] ??
        fe.employmentType?.[0] ??
        fe.headcountBudget?.[0],
    })
  }

  const effectiveFrom = effectiveDateFromOptionalIso(parsed.data.effectiveFrom)
  const fk = await assertActivePlacementReferences(organizationId, {
    departmentId: parsed.data.departmentId,
    gradeId: parsed.data.defaultGradeId,
    positionId: parsed.data.reportsToPositionId,
    effectiveFrom,
  })
  if (!fk.ok) return hrmActionFailure({ form: fk.message })
  if (
    parsed.data.positionOwnerEmployeeId &&
    !(await getActiveEmployee(
      organizationId,
      parsed.data.positionOwnerEmployeeId
    ))
  ) {
    return hrmActionFailure({ form: "Position owner is not active." })
  }

  const positionId = crypto.randomUUID()
  const reportingError = await positionReportingError(
    organizationId,
    positionId,
    parsed.data.reportsToPositionId,
    effectiveFrom
  )
  if (reportingError) return hrmActionFailure({ form: reportingError })

  const nextSnapshot = positionSnapshotFromParsed(parsed.data)
  const applyProjection = shouldApplyProjection(effectiveFrom)
  let row: { id: string } | undefined
  try {
    row = await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(hrmPosition)
        .values({
          id: positionId,
          organizationId,
          ...nextSnapshot,
          effectiveFrom,
          createdByUserId: userId,
          updatedByUserId: userId,
        })
        .returning({ id: hrmPosition.id })
      if (!inserted) throw new Error("position_insert_failed")
      await insertPositionVersion(tx, {
        organizationId,
        positionId: inserted.id,
        code: nextSnapshot.code,
        title: nextSnapshot.title,
        orgUnitId: nextSnapshot.departmentId,
        positionOwnerEmployeeId: nextSnapshot.positionOwnerEmployeeId,
        reportsToPositionId: nextSnapshot.reportsToPositionId,
        defaultGradeId: nextSnapshot.defaultGradeId,
        employmentType: nextSnapshot.employmentType,
        headcountBudget: nextSnapshot.headcountBudget,
        positionStatus: nextSnapshot.positionStatus,
        costCenterCode: nextSnapshot.costCenterCode,
        workLocationCode: nextSnapshot.workLocationCode,
        effectiveFrom,
        reason: parsed.data.reason,
        approvalReference: parsed.data.approvalReference,
        actorUserId: userId,
      })
      if (!applyProjection) {
        await tx
          .update(hrmPosition)
          .set({
            positionStatus: "planned",
            updatedAt: new Date(),
            updatedByUserId: userId,
          })
          .where(eq(hrmPosition.id, inserted.id))
      }
      await recordPositionChangeHistory(tx, {
        organizationId,
        positionId: inserted.id,
        changedByUserId: userId,
        existing: null,
        next: nextSnapshot,
        effectiveDate: effectiveFrom,
        reason: parsed.data.reason,
        approvalReference: parsed.data.approvalReference,
      })
      return inserted
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "Position code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not create position." })
  }
  if (!row) return hrmActionFailure({ form: "Could not create position." })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.position.create,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_position",
      resourceId: row.id,
      metadata: buildOrgStructureAuditMetadata({
        code: parsed.data.code,
        approvalReference: parsed.data.approvalReference,
        changes: buildOrgStructureFieldChanges(
          null,
          nextSnapshot,
          POSITION_CHANGE_FIELDS
        ),
      }),
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function updatePositionAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = updatePositionFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    positionId: formString(formData, "positionId"),
    code: formString(formData, "code"),
    title: formString(formData, "title"),
    departmentId: formString(formData, "departmentId"),
    defaultGradeId: formString(formData, "defaultGradeId"),
    positionOwnerEmployeeId: formString(formData, "positionOwnerEmployeeId"),
    reportsToPositionId: formString(formData, "reportsToPositionId"),
    employmentType: formString(formData, "employmentType") || undefined,
    headcountBudget: formString(formData, "headcountBudget"),
    positionStatus: formString(formData, "positionStatus") || undefined,
    costCenterCode: formString(formData, "costCenterCode"),
    workLocationCode: formString(formData, "workLocationCode"),
    effectiveFrom: formString(formData, "effectiveFrom"),
    reason: formString(formData, "reason"),
    approvalReference: formString(formData, "approvalReference"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: fe.code?.[0],
      title: fe.title?.[0],
      departmentId: fe.departmentId?.[0],
      positionId: fe.positionId?.[0],
      form:
        fe.orgSlug?.[0] ??
        fe.defaultGradeId?.[0] ??
        fe.reportsToPositionId?.[0] ??
        fe.employmentType?.[0] ??
        fe.headcountBudget?.[0],
    })
  }

  const existing = await getActivePosition(
    organizationId,
    parsed.data.positionId
  )
  if (!existing) return hrmActionFailure({ form: "Position not found." })

  const effectiveFrom = effectiveDateFromOptionalIso(parsed.data.effectiveFrom)
  const fk = await assertActivePlacementReferences(organizationId, {
    departmentId: parsed.data.departmentId,
    gradeId: parsed.data.defaultGradeId,
    positionId: parsed.data.reportsToPositionId,
    effectiveFrom,
  })
  if (!fk.ok) return hrmActionFailure({ form: fk.message })
  if (
    parsed.data.positionOwnerEmployeeId &&
    !(await getActiveEmployee(
      organizationId,
      parsed.data.positionOwnerEmployeeId
    ))
  ) {
    return hrmActionFailure({ form: "Position owner is not active." })
  }

  const reportingError = await positionReportingError(
    organizationId,
    parsed.data.positionId,
    parsed.data.reportsToPositionId,
    effectiveFrom
  )
  if (reportingError) return hrmActionFailure({ form: reportingError })

  const existingSnapshot = {
    code: existing.code,
    title: existing.title,
    departmentId: existing.departmentId,
    defaultGradeId: existing.defaultGradeId,
    positionOwnerEmployeeId: existing.positionOwnerEmployeeId,
    reportsToPositionId: existing.reportsToPositionId,
    employmentType: existing.employmentType,
    headcountBudget: existing.headcountBudget,
    positionStatus: existing.positionStatus,
    costCenterCode: existing.costCenterCode,
    workLocationCode: existing.workLocationCode,
    effectiveFrom: existing.effectiveFrom,
  }
  const nextSnapshot = positionSnapshotFromParsed(parsed.data)
  const applyProjection = shouldApplyProjection(effectiveFrom)
  let changes: ReturnType<typeof buildOrgStructureFieldChanges> = []
  try {
    changes = await db.transaction(async (tx) => {
      if (applyProjection) {
        await tx
          .update(hrmPosition)
          .set({
            ...nextSnapshot,
            effectiveFrom,
            updatedAt: new Date(),
            updatedByUserId: userId,
          })
          .where(
            and(
              eq(hrmPosition.id, parsed.data.positionId),
              eq(hrmPosition.organizationId, organizationId),
              isNull(hrmPosition.archivedAt)
            )
          )
      }
      await insertPositionVersion(tx, {
        organizationId,
        positionId: parsed.data.positionId,
        code: nextSnapshot.code,
        title: nextSnapshot.title,
        orgUnitId: nextSnapshot.departmentId,
        positionOwnerEmployeeId: nextSnapshot.positionOwnerEmployeeId,
        reportsToPositionId: nextSnapshot.reportsToPositionId,
        defaultGradeId: nextSnapshot.defaultGradeId,
        employmentType: nextSnapshot.employmentType,
        headcountBudget: nextSnapshot.headcountBudget,
        positionStatus: nextSnapshot.positionStatus,
        costCenterCode: nextSnapshot.costCenterCode,
        workLocationCode: nextSnapshot.workLocationCode,
        effectiveFrom,
        reason: parsed.data.reason,
        approvalReference: parsed.data.approvalReference,
        actorUserId: userId,
      })
      return recordPositionChangeHistory(tx, {
        organizationId,
        positionId: parsed.data.positionId,
        changedByUserId: userId,
        existing: existingSnapshot,
        next: nextSnapshot,
        effectiveDate: effectiveFrom,
        reason: parsed.data.reason,
        approvalReference: parsed.data.approvalReference,
      })
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return hrmActionFailure({
        code: "Position code already exists for this organization.",
      })
    }
    return hrmActionFailure({ form: "Could not update position." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.position.update,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceId: parsed.data.positionId,
      resourceType: "hrm_position",
      metadata: buildOrgStructureAuditMetadata({
        code: parsed.data.code,
        previousCode: existing.code,
        approvalReference: parsed.data.approvalReference,
        changes,
      }),
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function setPositionReportingLineAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = setPositionReportsToFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    positionId: formString(formData, "positionId"),
    reportsToPositionId: formString(formData, "reportsToPositionId"),
    effectiveFrom: formString(formData, "effectiveFrom"),
    reason: formString(formData, "reason"),
    approvalReference: formString(formData, "approvalReference"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      positionId: fe.positionId?.[0],
      form: fe.orgSlug?.[0] ?? fe.reportsToPositionId?.[0],
    })
  }

  const existing = await getActivePosition(
    organizationId,
    parsed.data.positionId
  )
  if (!existing) return hrmActionFailure({ form: "Position not found." })
  if (
    parsed.data.reportsToPositionId &&
    !(await getActivePosition(organizationId, parsed.data.reportsToPositionId))
  ) {
    return hrmActionFailure({ form: "Reports-to position is not active." })
  }

  const effectiveFrom = effectiveDateFromOptionalIso(parsed.data.effectiveFrom)
  const reportingError = await positionReportingError(
    organizationId,
    parsed.data.positionId,
    parsed.data.reportsToPositionId,
    effectiveFrom
  )
  if (reportingError) return hrmActionFailure({ form: reportingError })

  const applyProjection = shouldApplyProjection(effectiveFrom)
  const existingSnapshot = {
    code: existing.code,
    title: existing.title,
    departmentId: existing.departmentId,
    defaultGradeId: existing.defaultGradeId,
    positionOwnerEmployeeId: existing.positionOwnerEmployeeId,
    reportsToPositionId: existing.reportsToPositionId,
    employmentType: existing.employmentType,
    headcountBudget: existing.headcountBudget,
    positionStatus: existing.positionStatus,
    costCenterCode: existing.costCenterCode,
    workLocationCode: existing.workLocationCode,
    effectiveFrom: existing.effectiveFrom,
  }
  const nextSnapshot = {
    ...existingSnapshot,
    reportsToPositionId: parsed.data.reportsToPositionId,
    effectiveFrom,
  }
  let changes: ReturnType<typeof buildOrgStructureFieldChanges> = []
  await db.transaction(async (tx) => {
    if (applyProjection) {
      await tx
        .update(hrmPosition)
        .set({
          reportsToPositionId: parsed.data.reportsToPositionId,
          effectiveFrom,
          updatedAt: new Date(),
          updatedByUserId: userId,
        })
        .where(
          and(
            eq(hrmPosition.id, parsed.data.positionId),
            eq(hrmPosition.organizationId, organizationId),
            isNull(hrmPosition.archivedAt)
          )
        )
    }
    await insertPositionVersion(tx, {
      organizationId,
      positionId: parsed.data.positionId,
      code: nextSnapshot.code,
      title: nextSnapshot.title,
      orgUnitId: nextSnapshot.departmentId,
      positionOwnerEmployeeId: nextSnapshot.positionOwnerEmployeeId,
      reportsToPositionId: nextSnapshot.reportsToPositionId,
      defaultGradeId: nextSnapshot.defaultGradeId,
      employmentType: nextSnapshot.employmentType,
      headcountBudget: nextSnapshot.headcountBudget,
      positionStatus: nextSnapshot.positionStatus,
      costCenterCode: nextSnapshot.costCenterCode,
      workLocationCode: nextSnapshot.workLocationCode,
      effectiveFrom,
      reason: parsed.data.reason,
      approvalReference: parsed.data.approvalReference,
      actorUserId: userId,
    })
    changes = await recordPositionChangeHistory(tx, {
      organizationId,
      positionId: parsed.data.positionId,
      changedByUserId: userId,
      existing: existingSnapshot,
      next: nextSnapshot,
      effectiveDate: effectiveFrom,
      reason: parsed.data.reason,
      approvalReference: parsed.data.approvalReference,
    })
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.position.update_reporting_line,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_position",
      resourceId: parsed.data.positionId,
      metadata: buildOrgStructureAuditMetadata({
        code: existing.code,
        approvalReference: parsed.data.approvalReference,
        changes,
      }),
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function archivePositionAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "delete")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = archivePositionFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    positionId: formString(formData, "positionId"),
    effectiveFrom: formString(formData, "effectiveFrom"),
    reason: formString(formData, "reason"),
    approvalReference: formString(formData, "approvalReference"),
  })
  if (!parsed.success) {
    return hrmActionFailure({ form: "Invalid request." })
  }

  const existing = await db.query.hrmPosition.findFirst({
    where: and(
      eq(hrmPosition.id, parsed.data.positionId),
      eq(hrmPosition.organizationId, organizationId)
    ),
  })
  if (!existing || existing.archivedAt) {
    return hrmActionFailure({
      form: "Position not found or already archived.",
    })
  }

  const [nEmp, nReports] = await Promise.all([
    countEmployeesUsingPosition(organizationId, parsed.data.positionId),
    countActiveReportingPositions(organizationId, parsed.data.positionId),
  ])
  if (nEmp > 0) {
    return hrmActionFailure({
      form: "Employees still reference this position.",
    })
  }
  if (nReports > 0) {
    return hrmActionFailure({
      form: "Other active positions still report to this position.",
    })
  }

  const effectiveFrom = effectiveDateFromOptionalIso(parsed.data.effectiveFrom)
  const applyProjection = shouldApplyProjection(effectiveFrom)
  const now = new Date()
  await db.transaction(async (tx) => {
    await insertPositionVersion(tx, {
      organizationId,
      positionId: parsed.data.positionId,
      code: existing.code,
      title: existing.title,
      orgUnitId: existing.departmentId,
      positionOwnerEmployeeId: existing.positionOwnerEmployeeId,
      reportsToPositionId: existing.reportsToPositionId,
      defaultGradeId: existing.defaultGradeId,
      employmentType: existing.employmentType,
      headcountBudget: existing.headcountBudget,
      positionStatus: "closed",
      costCenterCode: existing.costCenterCode,
      workLocationCode: existing.workLocationCode,
      effectiveFrom,
      reason: parsed.data.reason,
      approvalReference: parsed.data.approvalReference,
      actorUserId: userId,
    })
    await recordPositionChangeHistory(tx, {
      organizationId,
      positionId: parsed.data.positionId,
      changedByUserId: userId,
      existing: {
        code: existing.code,
        title: existing.title,
        departmentId: existing.departmentId,
        defaultGradeId: existing.defaultGradeId,
        positionOwnerEmployeeId: existing.positionOwnerEmployeeId,
        reportsToPositionId: existing.reportsToPositionId,
        employmentType: existing.employmentType,
        headcountBudget: existing.headcountBudget,
        positionStatus: existing.positionStatus,
        costCenterCode: existing.costCenterCode,
        workLocationCode: existing.workLocationCode,
        effectiveFrom: existing.effectiveFrom,
      },
      next: {
        code: existing.code,
        title: existing.title,
        departmentId: existing.departmentId,
        defaultGradeId: existing.defaultGradeId,
        positionOwnerEmployeeId: existing.positionOwnerEmployeeId,
        reportsToPositionId: existing.reportsToPositionId,
        employmentType: existing.employmentType,
        headcountBudget: existing.headcountBudget,
        positionStatus: "closed",
        costCenterCode: existing.costCenterCode,
        workLocationCode: existing.workLocationCode,
        effectiveFrom,
      },
      effectiveDate: effectiveFrom,
      reason: parsed.data.reason,
      approvalReference: parsed.data.approvalReference,
    })
    if (applyProjection) {
      await tx
        .update(hrmPosition)
        .set({
          positionStatus: "closed",
          archivedAt: now,
          updatedAt: now,
          updatedByUserId: userId,
        })
        .where(
          and(
            eq(hrmPosition.id, parsed.data.positionId),
            eq(hrmPosition.organizationId, organizationId)
          )
        )
    }
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.position.deprecate,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_position",
      resourceId: parsed.data.positionId,
      metadata: {
        code: existing.code,
        approvalReference: parsed.data.approvalReference,
      },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function assignEmployeePlacementAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = assignEmployeeOrganizationPlacementFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    employeeId: formString(formData, "employeeId"),
    departmentId: formString(formData, "departmentId"),
    positionId: formString(formData, "positionId"),
    jobGradeId: formString(formData, "jobGradeId"),
    managerEmployeeId: formString(formData, "managerEmployeeId"),
    dottedLineManagerId: formString(formData, "dottedLineManagerId"),
    costCenterCode: formString(formData, "costCenterCode"),
    workLocationCode: formString(formData, "workLocationCode"),
    effectiveFrom: formString(formData, "effectiveFrom"),
    reason: formString(formData, "reason"),
    approvalReference: formString(formData, "approvalReference"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      departmentId: fe.departmentId?.[0],
      positionId: fe.positionId?.[0],
      gradeId: fe.jobGradeId?.[0],
      effectiveFrom: fe.effectiveFrom?.[0],
      form:
        fe.orgSlug?.[0] ??
        fe.managerEmployeeId?.[0] ??
        fe.costCenterCode?.[0] ??
        fe.workLocationCode?.[0] ??
        fe.reason?.[0],
    })
  }

  const employee = await getActiveEmployee(
    organizationId,
    parsed.data.employeeId
  )
  if (!employee) return hrmActionFailure({ form: "Employee not found." })
  if (parsed.data.managerEmployeeId === parsed.data.employeeId) {
    return hrmActionFailure({ form: "An employee cannot manage themselves." })
  }
  if (parsed.data.dottedLineManagerId === parsed.data.employeeId) {
    return hrmActionFailure({
      form: "An employee cannot be their own dotted-line manager.",
    })
  }
  if (
    parsed.data.managerEmployeeId &&
    !(await getActiveEmployee(organizationId, parsed.data.managerEmployeeId))
  ) {
    return hrmActionFailure({ form: "Manager is not active." })
  }
  if (
    parsed.data.dottedLineManagerId &&
    !(await getActiveEmployee(organizationId, parsed.data.dottedLineManagerId))
  ) {
    return hrmActionFailure({ form: "Dotted-line manager is not active." })
  }

  const nextEffective = isoDateOnlyToUtcDate(parsed.data.effectiveFrom)
  const managerCycle = await employeeManagerCycleError(
    organizationId,
    parsed.data.employeeId,
    parsed.data.managerEmployeeId,
    nextEffective
  )
  if (managerCycle) return hrmActionFailure({ form: managerCycle })

  if (parsed.data.positionId) {
    const placement = await assertPositionAcceptsPlacement(
      organizationId,
      parsed.data.positionId,
      nextEffective
    )
    if (!placement.ok) return hrmActionFailure({ form: placement.message })
  }

  const position = parsed.data.positionId
    ? await getActivePosition(organizationId, parsed.data.positionId)
    : null
  const derivedDepartmentId =
    parsed.data.departmentId ?? position?.departmentId ?? null
  const derivedGradeId =
    parsed.data.jobGradeId ?? position?.defaultGradeId ?? null

  const fk = await assertActivePlacementReferences(organizationId, {
    departmentId: derivedDepartmentId,
    positionId: parsed.data.positionId,
    gradeId: derivedGradeId,
    effectiveFrom: nextEffective,
  })
  if (!fk.ok) return hrmActionFailure({ form: fk.message })

  if (
    position &&
    derivedDepartmentId &&
    position.departmentId !== derivedDepartmentId
  ) {
    return hrmActionFailure({
      form: "Position belongs to a different org unit.",
    })
  }

  const department = derivedDepartmentId
    ? await getActiveDepartment(organizationId, derivedDepartmentId)
    : null
  const costCenterCode =
    parsed.data.costCenterCode ?? department?.costCenterCode ?? null
  const applyProjection = shouldApplyProjection(nextEffective)

  let assignmentId: string
  try {
    assignmentId = await db.transaction(async (tx) => {
      const { assignmentId: nextAssignmentId } =
        await upsertEmployeeEffectiveAssignment(
          {
            organizationId,
            employeeId: parsed.data.employeeId,
            actorUserId: userId,
            effectiveFrom: nextEffective,
            next: {
              currentDepartmentId: derivedDepartmentId,
              currentPositionId: parsed.data.positionId,
              currentJobGradeId: derivedGradeId,
              managerEmployeeId: parsed.data.managerEmployeeId,
              dottedLineManagerId: parsed.data.dottedLineManagerId,
              costCenterCode,
              workLocationCode: parsed.data.workLocationCode ?? null,
            },
            meta: {
              effectiveDate: nextEffective,
              reason: parsed.data.reason ?? null,
              approvalReference: parsed.data.approvalReference ?? null,
            },
            applyProjection,
          },
          tx
        )
      if (applyProjection && parsed.data.workLocationCode) {
        await tx
          .update(hrmEmployee)
          .set({
            workStateCode:
              parsed.data.workLocationCode ?? employee.workStateCode,
            updatedAt: new Date(),
            updatedByUserId: userId,
          })
          .where(
            and(
              eq(hrmEmployee.organizationId, organizationId),
              eq(hrmEmployee.id, parsed.data.employeeId)
            )
          )
      }
      if (!nextAssignmentId) throw new Error("assignment_insert_failed")
      await recordOrgStructureHistoryRows(tx, {
        organizationId,
        resourceType: "hrm_employee_assignment",
        resourceId: nextAssignmentId,
        changedByUserId: userId,
        changes: buildOrgStructureFieldChanges(
          null,
          {
            departmentId: derivedDepartmentId,
            positionId: parsed.data.positionId,
            jobGradeId: derivedGradeId,
            managerEmployeeId: parsed.data.managerEmployeeId,
            dottedLineManagerId: parsed.data.dottedLineManagerId,
            costCenterCode,
            workLocationCode: parsed.data.workLocationCode ?? null,
            effectiveFrom: nextEffective,
          },
          EMPLOYEE_PLACEMENT_CHANGE_FIELDS
        ),
        effectiveDate: nextEffective,
        reason: parsed.data.reason,
        approvalReference: parsed.data.approvalReference,
      })
      if (parsed.data.managerEmployeeId) {
        const reportingId = await insertEmployeeReportingRelationshipVersion(
          tx,
          {
            organizationId,
            employeeId: parsed.data.employeeId,
            managerEmployeeId: parsed.data.managerEmployeeId,
            relationshipType: "direct",
            effectiveFrom: nextEffective,
            status: "active",
            reason: parsed.data.reason,
            approvalReference: parsed.data.approvalReference,
            actorUserId: userId,
          }
        )
        await recordOrgStructureHistoryRows(tx, {
          organizationId,
          resourceType: "hrm_employee_reporting_relationship",
          resourceId: reportingId,
          changedByUserId: userId,
          changes: buildOrgStructureFieldChanges(
            null,
            {
              employeeId: parsed.data.employeeId,
              managerEmployeeId: parsed.data.managerEmployeeId,
              relationshipType: "direct",
              effectiveFrom: nextEffective,
              effectiveTo: null,
              status: "active",
            },
            REPORTING_RELATIONSHIP_CHANGE_FIELDS
          ),
          effectiveDate: nextEffective,
          reason: parsed.data.reason,
          approvalReference: parsed.data.approvalReference,
        })
      }
      if (parsed.data.dottedLineManagerId) {
        const reportingId = await insertEmployeeReportingRelationshipVersion(
          tx,
          {
            organizationId,
            employeeId: parsed.data.employeeId,
            managerEmployeeId: parsed.data.dottedLineManagerId,
            relationshipType: "dotted",
            effectiveFrom: nextEffective,
            status: "active",
            reason: parsed.data.reason,
            approvalReference: parsed.data.approvalReference,
            actorUserId: userId,
          }
        )
        await recordOrgStructureHistoryRows(tx, {
          organizationId,
          resourceType: "hrm_employee_reporting_relationship",
          resourceId: reportingId,
          changedByUserId: userId,
          changes: buildOrgStructureFieldChanges(
            null,
            {
              employeeId: parsed.data.employeeId,
              managerEmployeeId: parsed.data.dottedLineManagerId,
              relationshipType: "dotted",
              effectiveFrom: nextEffective,
              effectiveTo: null,
              status: "active",
            },
            REPORTING_RELATIONSHIP_CHANGE_FIELDS
          ),
          effectiveDate: nextEffective,
          reason: parsed.data.reason,
          approvalReference: parsed.data.approvalReference,
        })
      }
      return nextAssignmentId
    })
  } catch (err) {
    const code = errorCode(err)
    if (code === "effective_from_before_current") {
      return hrmActionFailure({
        effectiveFrom:
          "Effective date cannot be earlier than the current active assignment.",
      })
    }
    return hrmActionFailure({ form: "Could not assign employee placement." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.placement.create,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employee_assignment",
      resourceId: assignmentId,
      metadata: {
        employeeId: parsed.data.employeeId,
        departmentId: derivedDepartmentId,
        positionId: parsed.data.positionId,
        jobGradeId: derivedGradeId,
        effectiveFrom: parsed.data.effectiveFrom,
        approvalReference: parsed.data.approvalReference,
      },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}

export async function setEmployeeReportingRelationshipAction(
  _prev: OrgStructureFormState | undefined,
  formData: FormData
): Promise<OrgStructureFormState> {
  const gate = await requireOrgStructureMutationGate(formData, "update")
  if (!gate.ok) return gate.response
  const { organizationId, userId, sessionId } = gate

  const parsed = setEmployeeReportingFormSchema.safeParse({
    orgSlug: formString(formData, "orgSlug"),
    employeeId: formString(formData, "employeeId"),
    managerEmployeeId: formString(formData, "managerEmployeeId"),
    relationshipType: formString(formData, "relationshipType"),
    effectiveFrom: formString(formData, "effectiveFrom"),
    effectiveTo: formString(formData, "effectiveTo"),
    status: formString(formData, "status") || undefined,
    reason: formString(formData, "reason"),
    approvalReference: formString(formData, "approvalReference"),
  })
  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      form:
        fe.orgSlug?.[0] ??
        fe.managerEmployeeId?.[0] ??
        fe.relationshipType?.[0] ??
        fe.effectiveFrom?.[0] ??
        fe.status?.[0],
    })
  }

  if (parsed.data.employeeId === parsed.data.managerEmployeeId) {
    return hrmActionFailure({ form: "An employee cannot manage themselves." })
  }
  const [employee, manager] = await Promise.all([
    getActiveEmployee(organizationId, parsed.data.employeeId),
    getActiveEmployee(organizationId, parsed.data.managerEmployeeId),
  ])
  if (!employee) return hrmActionFailure({ form: "Employee not found." })
  if (!manager) return hrmActionFailure({ form: "Manager is not active." })

  if (parsed.data.relationshipType === "direct") {
    const effectiveFrom = isoDateOnlyToUtcDate(parsed.data.effectiveFrom)
    const managerCycle = await employeeManagerCycleError(
      organizationId,
      parsed.data.employeeId,
      parsed.data.managerEmployeeId,
      effectiveFrom
    )
    if (managerCycle) return hrmActionFailure({ form: managerCycle })
  }

  const effectiveFrom = isoDateOnlyToUtcDate(parsed.data.effectiveFrom)
  const effectiveTo = parsed.data.effectiveTo
    ? isoDateOnlyToUtcDate(parsed.data.effectiveTo)
    : null
  if (effectiveTo && effectiveTo.getTime() < effectiveFrom.getTime()) {
    return hrmActionFailure({
      effectiveFrom: "Effective-to date cannot be earlier than effective-from.",
    })
  }
  const applyProjection = shouldApplyProjection(effectiveFrom)

  const reportingId = await db.transaction(async (tx) => {
    const id = await insertEmployeeReportingRelationshipVersion(tx, {
      organizationId,
      employeeId: parsed.data.employeeId,
      managerEmployeeId: parsed.data.managerEmployeeId,
      relationshipType: parsed.data.relationshipType,
      effectiveFrom,
      effectiveTo,
      status: parsed.data.status,
      reason: parsed.data.reason,
      approvalReference: parsed.data.approvalReference,
      actorUserId: userId,
    })
    if (applyProjection && parsed.data.status === "active") {
      if (parsed.data.relationshipType === "direct") {
        await tx
          .update(hrmEmployee)
          .set({
            managerEmployeeId: parsed.data.managerEmployeeId,
            updatedAt: new Date(),
            updatedByUserId: userId,
          })
          .where(
            and(
              eq(hrmEmployee.organizationId, organizationId),
              eq(hrmEmployee.id, parsed.data.employeeId)
            )
          )
      }
      if (parsed.data.relationshipType === "dotted") {
        await tx
          .update(hrmEmployee)
          .set({
            dottedLineManagerId: parsed.data.managerEmployeeId,
            updatedAt: new Date(),
            updatedByUserId: userId,
          })
          .where(
            and(
              eq(hrmEmployee.organizationId, organizationId),
              eq(hrmEmployee.id, parsed.data.employeeId)
            )
          )
      }
    }
    await recordOrgStructureHistoryRows(tx, {
      organizationId,
      resourceType: "hrm_employee_reporting_relationship",
      resourceId: id,
      changedByUserId: userId,
      changes: buildOrgStructureFieldChanges(
        null,
        {
          employeeId: parsed.data.employeeId,
          managerEmployeeId: parsed.data.managerEmployeeId,
          relationshipType: parsed.data.relationshipType,
          effectiveFrom,
          effectiveTo,
          status: parsed.data.status,
        },
        REPORTING_RELATIONSHIP_CHANGE_FIELDS
      ),
      effectiveDate: effectiveFrom,
      reason: parsed.data.reason,
      approvalReference: parsed.data.approvalReference,
    })
    return id
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: HRM_ORG_STRUCTURE_AUDIT.reportingRelationship.create,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_employee_reporting_relationship",
      resourceId: reportingId,
      metadata: {
        employeeId: parsed.data.employeeId,
        managerEmployeeId: parsed.data.managerEmployeeId,
        relationshipType: parsed.data.relationshipType,
        effectiveFrom: parsed.data.effectiveFrom,
        approvalReference: parsed.data.approvalReference,
      },
    })
  )

  revalidateOrganizationSurface()
  return { ok: true }
}
