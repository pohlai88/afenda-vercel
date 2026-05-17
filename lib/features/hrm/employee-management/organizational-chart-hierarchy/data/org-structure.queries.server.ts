import "server-only"

import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm"

import { ORG_CHART_ROOT_ID, type OrgChartNode } from "./org-chart.shared"
import { isOrgRecordEffectiveAsOf } from "./org-structure-effective.shared"
import { chooseOrgStructureVersion } from "./org-structure-versioning.shared"

import { db } from "#lib/db"
import {
  hrmApplication,
  hrmDepartment,
  hrmEmployee,
  hrmEmployeeAssignment,
  hrmEmployeeReportingRelationship,
  hrmJobGrade,
  hrmJobOffer,
  hrmJobRequisition,
  hrmOrgUnitVersion,
  hrmPosition,
  hrmPositionVersion,
} from "#lib/db/schema"

export type DepartmentListRow = {
  id: string
  code: string
  name: string
  /** Structural type — "legal_entity" | "business_unit" | "department" | "sub_department" | "team" | "location". HRM-ORG-002. */
  orgUnitType: string
  orgUnitStatus: string
  parentDepartmentId: string | null
  headEmployeeId: string | null
  costCenterCode: string | null
  workLocationCode: string | null
  /** When this org unit structure becomes effective; null = immediate. HRM-ORG-012/014. */
  effectiveFrom: Date | null
  effectiveTo: Date | null
  reason: string | null
  approvalReference: string | null
  archivedAt: Date | null
}

export type JobGradeListRow = {
  id: string
  code: string
  name: string
  ordinal: number
  minSalaryAmount: string | null
  maxSalaryAmount: string | null
  currency: string
  benefitTierCode: string | null
  archivedAt: Date | null
}

export type PositionListRow = {
  id: string
  code: string
  title: string
  departmentId: string
  departmentCode: string | null
  defaultGradeId: string | null
  defaultGradeCode: string | null
  positionOwnerEmployeeId: string | null
  positionOwnerLabel: string | null
  reportsToPositionId: string | null
  reportsToPositionCode: string | null
  employmentType: string
  headcountBudget: number | null
  occupancyCount: number
  /** Lifecycle status: "active" | "planned" | "frozen" | "closed". HRM-ORG-010. */
  positionStatus: string
  /** Cost center override for this position; falls back to department when null. HRM-ORG-017. */
  costCenterCode: string | null
  /** Work location override for this position; falls back to department when null. HRM-ORG-018. */
  workLocationCode: string | null
  /** When this position becomes effective in the headcount plan. HRM-ORG-014. */
  effectiveFrom: Date | null
  effectiveTo: Date | null
  reason: string | null
  approvalReference: string | null
  archivedAt: Date | null
}

export type OrgUnitTreeRow = DepartmentListRow & {
  parentCode: string | null
  headEmployeeLabel: string | null
  depth: number
  childCount: number
  activePositionCount: number
  activeEmployeeCount: number
}

export type PositionControlRow = PositionListRow & {
  headcountVariance: number | null
  pendingHireCount: number
  availableHeadcount: number | null
  /**
   * Derived occupancy state combining `positionStatus` with headcount math.
   * - "planned"    : position not yet active (positionStatus = "planned")
   * - "frozen"     : placements blocked (positionStatus = "frozen")
   * - "closed"     : permanently deactivated (positionStatus = "closed")
   * - "open"       : active, has budget capacity remaining
   * - "filled"     : active, occupancy = budget
   * - "over_budget": active, occupancy > budget
   * - "unbudgeted" : active, no headcount budget set
   */
  occupancyState:
    | "planned"
    | "frozen"
    | "closed"
    | "open"
    | "filled"
    | "over_budget"
    | "unbudgeted"
}

export type EmployeeAssignmentHistoryRow = {
  id: string
  employeeId: string
  departmentId: string | null
  departmentCode: string | null
  positionId: string | null
  positionCode: string | null
  jobGradeId: string | null
  jobGradeCode: string | null
  managerEmployeeId: string | null
  managerLabel: string | null
  costCenterCode: string | null
  workLocationCode: string | null
  effectiveFrom: Date
  effectiveTo: Date | null
  status: string
  reason: string | null
  createdAt: Date
}

export type OrgStructureEmployeePlacementRow = {
  id: string
  employeeNumber: string
  label: string
  currentDepartmentId: string | null
  departmentCode: string | null
  currentPositionId: string | null
  positionCode: string | null
  currentJobGradeId: string | null
  jobGradeCode: string | null
  managerEmployeeId: string | null
  managerLabel: string | null
  dottedLineManagerId: string | null
  dottedLineManagerLabel: string | null
  matrixManagerIds: string[]
  matrixManagerLabels: string[]
}

export type OrgReportingChainRow = {
  employeeId: string
  label: string
  depth: number
}

export type OrgHeadcountByManagerRow = {
  managerEmployeeId: string | null
  managerLabel: string | null
  directReportCount: number
  departmentIds: string[]
}

export type OrgStructureSummaryRow = {
  id: string
  label: string
  activeOrgUnitCount: number
  activePositionCount: number
  activeEmployeeCount: number
  budgetedHeadcount: number
  occupiedHeadcount: number
  pendingHireCount: number
  openHeadcount: number
}

export type OrgStructureSummarySet = {
  legalEntities: OrgStructureSummaryRow[]
  businessUnits: OrgStructureSummaryRow[]
  departments: OrgStructureSummaryRow[]
  teams: OrgStructureSummaryRow[]
  managers: OrgStructureSummaryRow[]
  positions: OrgStructureSummaryRow[]
  locations: OrgStructureSummaryRow[]
}

export type OrgStructureExportRow = {
  orgUnitCode: string
  orgUnitName: string
  parentOrgUnitCode: string | null
  costCenterCode: string | null
  workLocationCode: string | null
  positionCode: string | null
  positionTitle: string | null
  positionHeadcountBudget: number | null
  positionOccupancyCount: number
  occupancyState: string | null
  employeeNumber: string | null
  employeeLabel: string | null
  managerLabel: string | null
  dottedLineManagerLabel: string | null
  matrixManagerLabels: string | null
  orgUnitType: string | null
  orgUnitStatus: string | null
  positionStatus: string | null
  pendingHireCount: number
  openHeadcountAfterPending: number | null
  effectiveFrom: Date | null
  effectiveTo: Date | null
  reason: string | null
  approvalReference: string | null
}

export type OrgStructureHealthIssue = {
  id: string
  severity: "info" | "attention" | "critical"
  kind:
    | "department_cycle"
    | "position_cycle"
    | "empty_department"
    | "over_budget_position"
    | "missing_grade"
    | "missing_department"
    | "missing_position"
    | "invalid_manager"
    /** An employee is placed in a frozen position — no new placements should be accepted. HRM-ORG-010. */
    | "frozen_position_occupied"
    /** A department has no head employee assigned. Info-level advisory. HRM-ORG-008. */
    | "department_no_head"
  title: string
  detail: string
  resourceType: "hrm_department" | "hrm_position" | "hrm_employee"
  resourceId: string
}

export type OrgStructureSnapshot = {
  orgUnits: OrgUnitTreeRow[]
  positions: PositionControlRow[]
  grades: JobGradeListRow[]
  health: OrgStructureHealthIssue[]
  summaries: OrgStructureSummarySet
  totals: {
    activeOrgUnits: number
    activePositions: number
    activeEmployees: number
    budgetedHeadcount: number
    occupiedHeadcount: number
    pendingHireCount: number
    openHeadcount: number
    overBudgetPositions: number
    /** Positions with positionStatus = "planned". HRM-ORG-010. */
    plannedPositions: number
    /** Positions with positionStatus = "frozen". HRM-ORG-010. */
    frozenPositions: number
    /** Positions with positionStatus = "closed". HRM-ORG-010. */
    closedPositions: number
  }
}

export type OrgStructureQueryOptions = {
  includeArchived: boolean
  /** When set, excludes units/positions not yet effective and archived before this date. HRM-ORG-012/014. */
  asOfDate?: Date
  includeFuture?: boolean
  orgUnitType?: string
  orgUnitStatus?: string
  positionStatus?: string
  legalEntityId?: string
  businessUnitId?: string
  departmentId?: string
  teamId?: string
  managerEmployeeId?: string
  positionId?: string
  workLocationCode?: string
  costCenterCode?: string
}

function filterOrgRowsByAsOf<
  T extends {
    effectiveFrom: Date | null
    effectiveTo?: Date | null
    archivedAt: Date | null
  },
>(rows: readonly T[], asOfDate: Date | undefined): T[] {
  const asOf = asOfDate ?? new Date()
  return rows.filter(
    (row) =>
      isOrgRecordEffectiveAsOf(row.effectiveFrom, asOf) &&
      (!row.effectiveTo || row.effectiveTo.getTime() >= asOf.getTime()) &&
      (row.archivedAt === null || row.archivedAt.getTime() > asOf.getTime())
  )
}

function orgUnitIsWithin(
  orgUnitId: string | null | undefined,
  ancestorId: string | null | undefined,
  departmentMap: ReadonlyMap<
    string,
    Pick<DepartmentListRow, "parentDepartmentId">
  >
): boolean {
  if (!orgUnitId || !ancestorId) return false
  if (orgUnitId === ancestorId) return true

  const visited = new Set<string>()
  let cursor: string | null | undefined = orgUnitId
  while (cursor) {
    if (cursor === ancestorId) return true
    if (visited.has(cursor)) return false
    visited.add(cursor)
    cursor = departmentMap.get(cursor)?.parentDepartmentId
  }
  return false
}

function orgUnitMatchesDimensionFilters(
  row: Pick<DepartmentListRow, "id">,
  departmentMap: ReadonlyMap<string, DepartmentListRow>,
  options: Pick<
    OrgStructureQueryOptions,
    "legalEntityId" | "businessUnitId" | "departmentId" | "teamId"
  >
): boolean {
  const requestedAncestors = [
    options.legalEntityId,
    options.businessUnitId,
    options.departmentId,
    options.teamId,
  ].filter((id): id is string => Boolean(id))

  return requestedAncestors.every((ancestorId) =>
    orgUnitIsWithin(row.id, ancestorId, departmentMap)
  )
}

export async function listOrgUnitsAsOf(
  organizationId: string,
  options: { includeArchived: boolean; asOfDate: Date }
): Promise<DepartmentListRow[]> {
  const rows = await listDepartmentsForOrg(organizationId, options)
  return filterOrgRowsByAsOf(rows, options.asOfDate)
}

/** Active positions with remaining headcount capacity (HRM-ORG-009/010). */
export async function listVacantPositions(
  organizationId: string,
  options: { includeArchived?: boolean } = {}
): Promise<PositionControlRow[]> {
  const rows = await listPositionControlRows(organizationId, {
    includeArchived: options.includeArchived ?? false,
  })
  return rows.filter(
    (row) =>
      row.archivedAt === null &&
      row.positionStatus === "active" &&
      (row.occupancyState === "open" || row.occupancyState === "unbudgeted")
  )
}

export async function listDepartmentsForOrg(
  organizationId: string,
  options: OrgStructureQueryOptions
): Promise<DepartmentListRow[]> {
  const includeProjectionRows = Boolean(
    options.includeArchived || options.includeFuture || options.asOfDate
  )
  const [projectionRows, versionRows] = await Promise.all([
    db
      .select({
        id: hrmDepartment.id,
        code: hrmDepartment.code,
        name: hrmDepartment.name,
        orgUnitType: hrmDepartment.orgUnitType,
        orgUnitStatus: hrmDepartment.orgUnitStatus,
        parentDepartmentId: hrmDepartment.parentDepartmentId,
        headEmployeeId: hrmDepartment.headEmployeeId,
        costCenterCode: hrmDepartment.costCenterCode,
        workLocationCode: hrmDepartment.workLocationCode,
        effectiveFrom: hrmDepartment.effectiveFrom,
        archivedAt: hrmDepartment.archivedAt,
      })
      .from(hrmDepartment)
      .where(
        includeProjectionRows
          ? eq(hrmDepartment.organizationId, organizationId)
          : and(
              eq(hrmDepartment.organizationId, organizationId),
              isNull(hrmDepartment.archivedAt)
            )
      )
      .orderBy(asc(hrmDepartment.code)),
    db
      .select({
        orgUnitId: hrmOrgUnitVersion.orgUnitId,
        code: hrmOrgUnitVersion.code,
        name: hrmOrgUnitVersion.name,
        orgUnitType: hrmOrgUnitVersion.orgUnitType,
        orgUnitStatus: hrmOrgUnitVersion.status,
        parentDepartmentId: hrmOrgUnitVersion.parentOrgUnitId,
        headEmployeeId: hrmOrgUnitVersion.managerEmployeeId,
        costCenterCode: hrmOrgUnitVersion.costCenterCode,
        workLocationCode: hrmOrgUnitVersion.workLocationCode,
        effectiveFrom: hrmOrgUnitVersion.effectiveFrom,
        effectiveTo: hrmOrgUnitVersion.effectiveTo,
        reason: hrmOrgUnitVersion.reason,
        approvalReference: hrmOrgUnitVersion.approvalReference,
      })
      .from(hrmOrgUnitVersion)
      .where(eq(hrmOrgUnitVersion.organizationId, organizationId))
      .orderBy(
        asc(hrmOrgUnitVersion.orgUnitId),
        desc(hrmOrgUnitVersion.effectiveFrom)
      ),
  ])

  const versionsByUnit = new Map<string, typeof versionRows>()
  for (const version of versionRows) {
    const versions = versionsByUnit.get(version.orgUnitId) ?? []
    versions.push(version)
    versionsByUnit.set(version.orgUnitId, versions)
  }

  const asOf = options.asOfDate ?? new Date()
  let rows = projectionRows.map((row) => {
    const effectiveVersion = chooseOrgStructureVersion(
      versionsByUnit.get(row.id) ?? [],
      { asOfDate: asOf, includeFuture: options.includeFuture }
    )
    if (!effectiveVersion) {
      return {
        ...row,
        effectiveTo: null,
        reason: null,
        approvalReference: null,
      }
    }
    return {
      id: row.id,
      archivedAt:
        effectiveVersion.orgUnitStatus === "closed" ? row.archivedAt : null,
      ...effectiveVersion,
      effectiveFrom: effectiveVersion.effectiveFrom,
      orgUnitStatus: effectiveVersion.orgUnitStatus,
    }
  })

  if (!options.includeFuture) {
    rows = filterOrgRowsByAsOf(rows, options.asOfDate)
  }
  const departmentMap = new Map(rows.map((row) => [row.id, row]))
  return rows
    .filter((row) =>
      orgUnitMatchesDimensionFilters(row, departmentMap, options)
    )
    .filter((row) => options.includeArchived || row.orgUnitStatus !== "closed")
    .filter((row) =>
      options.orgUnitType ? row.orgUnitType === options.orgUnitType : true
    )
    .filter((row) =>
      options.managerEmployeeId
        ? row.headEmployeeId === options.managerEmployeeId
        : true
    )
    .filter((row) =>
      options.orgUnitStatus ? row.orgUnitStatus === options.orgUnitStatus : true
    )
    .filter((row) =>
      options.workLocationCode
        ? row.workLocationCode === options.workLocationCode
        : true
    )
    .filter((row) =>
      options.costCenterCode
        ? row.costCenterCode === options.costCenterCode
        : true
    )
    .sort((a, b) => a.code.localeCompare(b.code))
}

export async function listJobGradesForOrg(
  organizationId: string,
  options: { includeArchived: boolean }
): Promise<JobGradeListRow[]> {
  return db
    .select({
      id: hrmJobGrade.id,
      code: hrmJobGrade.code,
      name: hrmJobGrade.name,
      ordinal: hrmJobGrade.ordinal,
      minSalaryAmount: hrmJobGrade.minSalaryAmount,
      maxSalaryAmount: hrmJobGrade.maxSalaryAmount,
      currency: hrmJobGrade.currency,
      benefitTierCode: hrmJobGrade.benefitTierCode,
      archivedAt: hrmJobGrade.archivedAt,
    })
    .from(hrmJobGrade)
    .where(
      options.includeArchived
        ? eq(hrmJobGrade.organizationId, organizationId)
        : and(
            eq(hrmJobGrade.organizationId, organizationId),
            isNull(hrmJobGrade.archivedAt)
          )
    )
    .orderBy(asc(hrmJobGrade.ordinal), asc(hrmJobGrade.code))
}

export async function listPositionsForOrg(
  organizationId: string,
  options: OrgStructureQueryOptions
): Promise<PositionListRow[]> {
  const includeProjectionRows = Boolean(
    options.includeArchived || options.includeFuture || options.asOfDate
  )
  const [positions, departments, grades, employees, versionRows] =
    await Promise.all([
      db
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
          includeProjectionRows
            ? eq(hrmPosition.organizationId, organizationId)
            : and(
                eq(hrmPosition.organizationId, organizationId),
                isNull(hrmPosition.archivedAt)
              )
        )
        .orderBy(asc(hrmPosition.code)),
      listDepartmentsForOrg(organizationId, {
        includeArchived: true,
        asOfDate: options.asOfDate,
        includeFuture: options.includeFuture,
      }),
      listJobGradesForOrg(organizationId, { includeArchived: true }),
      listActiveEmployeePlacements(organizationId, options),
      db
        .select({
          positionId: hrmPositionVersion.positionId,
          code: hrmPositionVersion.code,
          title: hrmPositionVersion.title,
          departmentId: hrmPositionVersion.orgUnitId,
          defaultGradeId: hrmPositionVersion.defaultGradeId,
          positionOwnerEmployeeId: hrmPositionVersion.positionOwnerEmployeeId,
          reportsToPositionId: hrmPositionVersion.reportsToPositionId,
          employmentType: hrmPositionVersion.employmentType,
          headcountBudget: hrmPositionVersion.headcountBudget,
          positionStatus: hrmPositionVersion.positionStatus,
          costCenterCode: hrmPositionVersion.costCenterCode,
          workLocationCode: hrmPositionVersion.workLocationCode,
          effectiveFrom: hrmPositionVersion.effectiveFrom,
          effectiveTo: hrmPositionVersion.effectiveTo,
          reason: hrmPositionVersion.reason,
          approvalReference: hrmPositionVersion.approvalReference,
        })
        .from(hrmPositionVersion)
        .where(eq(hrmPositionVersion.organizationId, organizationId))
        .orderBy(
          asc(hrmPositionVersion.positionId),
          desc(hrmPositionVersion.effectiveFrom)
        ),
    ])

  const departmentMap = new Map(departments.map((d) => [d.id, d]))
  const gradeMap = new Map(grades.map((g) => [g.id, g.code]))
  const positionCodeMap = new Map(positions.map((p) => [p.id, p.code]))
  const ownerIds = positions
    .map((p) => p.positionOwnerEmployeeId)
    .concat(versionRows.map((p) => p.positionOwnerEmployeeId))
    .filter((id): id is string => Boolean(id))
  const owners = await listEmployeeLabels(organizationId, ownerIds)
  const ownerMap = new Map(owners.map((owner) => [owner.id, owner.label]))
  const versionsByPosition = new Map<string, typeof versionRows>()
  for (const version of versionRows) {
    const versions = versionsByPosition.get(version.positionId) ?? []
    versions.push(version)
    versionsByPosition.set(version.positionId, versions)
  }
  const occupancy = new Map<string, number>()
  const directManagersByPosition = new Map<string, Set<string>>()
  for (const employee of employees) {
    if (!employee.currentPositionId) continue
    occupancy.set(
      employee.currentPositionId,
      (occupancy.get(employee.currentPositionId) ?? 0) + 1
    )
    if (employee.managerEmployeeId) {
      const managers =
        directManagersByPosition.get(employee.currentPositionId) ?? new Set()
      managers.add(employee.managerEmployeeId)
      directManagersByPosition.set(employee.currentPositionId, managers)
    }
  }

  const asOf = options.asOfDate ?? new Date()
  const mapped = positions.map((p) => {
    const effectiveVersion = chooseOrgStructureVersion(
      versionsByPosition.get(p.id) ?? [],
      { asOfDate: asOf, includeFuture: options.includeFuture }
    )
    const row = effectiveVersion
      ? {
          id: p.id,
          archivedAt:
            effectiveVersion.positionStatus === "closed" ? p.archivedAt : null,
          code: effectiveVersion.code,
          title: effectiveVersion.title,
          departmentId: effectiveVersion.departmentId,
          defaultGradeId: effectiveVersion.defaultGradeId,
          positionOwnerEmployeeId: effectiveVersion.positionOwnerEmployeeId,
          reportsToPositionId: effectiveVersion.reportsToPositionId,
          employmentType: effectiveVersion.employmentType,
          headcountBudget: effectiveVersion.headcountBudget,
          positionStatus: effectiveVersion.positionStatus,
          costCenterCode: effectiveVersion.costCenterCode,
          workLocationCode: effectiveVersion.workLocationCode,
          effectiveFrom: effectiveVersion.effectiveFrom,
          effectiveTo: effectiveVersion.effectiveTo,
          reason: effectiveVersion.reason,
          approvalReference: effectiveVersion.approvalReference,
        }
      : {
          ...p,
          effectiveTo: null,
          reason: null,
          approvalReference: null,
        }
    return {
      ...row,
      departmentCode: departmentMap.get(row.departmentId)?.code ?? null,
      defaultGradeCode: row.defaultGradeId
        ? (gradeMap.get(row.defaultGradeId) ?? null)
        : null,
      positionOwnerLabel: row.positionOwnerEmployeeId
        ? (ownerMap.get(row.positionOwnerEmployeeId) ?? null)
        : null,
      reportsToPositionCode: row.reportsToPositionId
        ? (positionCodeMap.get(row.reportsToPositionId) ?? null)
        : null,
      occupancyCount: occupancy.get(row.id) ?? 0,
    }
  })
  const effectiveRows = options.includeFuture
    ? mapped
    : filterOrgRowsByAsOf(mapped, options.asOfDate)
  return effectiveRows
    .filter((row) => options.includeArchived || row.positionStatus !== "closed")
    .filter((row) =>
      orgUnitMatchesDimensionFilters(
        { id: row.departmentId },
        departmentMap,
        options
      )
    )
    .filter((row) =>
      options.positionStatus
        ? row.positionStatus === options.positionStatus
        : true
    )
    .filter((row) =>
      options.departmentId ? row.departmentId === options.departmentId : true
    )
    .filter((row) =>
      options.positionId ? row.id === options.positionId : true
    )
    .filter((row) =>
      options.managerEmployeeId
        ? row.positionOwnerEmployeeId === options.managerEmployeeId ||
          departmentMap.get(row.departmentId)?.headEmployeeId ===
            options.managerEmployeeId ||
          Boolean(
            directManagersByPosition.get(row.id)?.has(options.managerEmployeeId)
          )
        : true
    )
    .filter((row) =>
      options.workLocationCode
        ? row.workLocationCode === options.workLocationCode
        : true
    )
    .filter((row) =>
      options.costCenterCode
        ? row.costCenterCode === options.costCenterCode
        : true
    )
}

export async function listOrgUnitTree(
  organizationId: string,
  options: OrgStructureQueryOptions
): Promise<OrgUnitTreeRow[]> {
  const [departments, positions, employees] = await Promise.all([
    listDepartmentsForOrg(organizationId, options),
    listPositionsForOrg(organizationId, { ...options, includeArchived: true }),
    listActiveEmployeePlacements(organizationId, options),
  ])

  const departmentMap = new Map(departments.map((d) => [d.id, d]))
  const headIds = departments
    .map((d) => d.headEmployeeId)
    .filter((id): id is string => Boolean(id))
  const heads = await listEmployeeLabels(organizationId, headIds)
  const headMap = new Map(heads.map((e) => [e.id, e.label]))

  const childCounts = new Map<string, number>()
  for (const department of departments) {
    if (!department.parentDepartmentId) continue
    childCounts.set(
      department.parentDepartmentId,
      (childCounts.get(department.parentDepartmentId) ?? 0) + 1
    )
  }

  const positionCounts = new Map<string, number>()
  for (const position of positions) {
    if (position.archivedAt) continue
    positionCounts.set(
      position.departmentId,
      (positionCounts.get(position.departmentId) ?? 0) + 1
    )
  }

  const employeeCounts = new Map<string, number>()
  for (const employee of employees) {
    if (!employee.currentDepartmentId) continue
    employeeCounts.set(
      employee.currentDepartmentId,
      (employeeCounts.get(employee.currentDepartmentId) ?? 0) + 1
    )
  }

  return departments.map((department) => ({
    ...department,
    parentCode: department.parentDepartmentId
      ? (departmentMap.get(department.parentDepartmentId)?.code ?? null)
      : null,
    headEmployeeLabel: department.headEmployeeId
      ? (headMap.get(department.headEmployeeId) ?? null)
      : null,
    depth: departmentDepth(department.id, departmentMap),
    childCount: childCounts.get(department.id) ?? 0,
    activePositionCount: positionCounts.get(department.id) ?? 0,
    activeEmployeeCount: employeeCounts.get(department.id) ?? 0,
  }))
}

export type OrgPendingHireDemandRow = {
  requisitionId: string
  departmentId: string | null
  positionId: string | null
  pendingCount: number
  acceptedOfferCount: number
}

export async function listPendingHireDemand(
  organizationId: string
): Promise<OrgPendingHireDemandRow[]> {
  const [requisitions, hiredCounts, acceptedOffers] = await Promise.all([
    db
      .select({
        requisitionId: hrmJobRequisition.id,
        departmentId: hrmJobRequisition.departmentId,
        positionId: hrmJobRequisition.positionId,
        headcount: hrmJobRequisition.headcount,
      })
      .from(hrmJobRequisition)
      .where(
        and(
          eq(hrmJobRequisition.organizationId, organizationId),
          eq(hrmJobRequisition.status, "open")
        )
      ),
    db
      .select({
        requisitionId: hrmApplication.requisitionId,
        n: count(),
      })
      .from(hrmApplication)
      .where(
        and(
          eq(hrmApplication.organizationId, organizationId),
          eq(hrmApplication.stage, "hired")
        )
      )
      .groupBy(hrmApplication.requisitionId),
    db
      .select({
        requisitionId: hrmApplication.requisitionId,
        departmentId: hrmJobRequisition.departmentId,
        positionId: hrmJobRequisition.positionId,
        n: count(),
      })
      .from(hrmJobOffer)
      .innerJoin(
        hrmApplication,
        and(
          eq(hrmApplication.id, hrmJobOffer.applicationId),
          eq(hrmApplication.organizationId, organizationId)
        )
      )
      .innerJoin(
        hrmJobRequisition,
        and(
          eq(hrmJobRequisition.id, hrmApplication.requisitionId),
          eq(hrmJobRequisition.organizationId, organizationId)
        )
      )
      .where(
        and(
          eq(hrmJobOffer.organizationId, organizationId),
          eq(hrmJobOffer.status, "accepted"),
          isNull(hrmApplication.convertedEmployeeId)
        )
      )
      .groupBy(
        hrmApplication.requisitionId,
        hrmJobRequisition.departmentId,
        hrmJobRequisition.positionId
      ),
  ])

  const hiredByRequisition = new Map(
    hiredCounts.map((row) => [row.requisitionId, Number(row.n)] as const)
  )
  const acceptedByRequisition = new Map(
    acceptedOffers.map((row) => [row.requisitionId, Number(row.n)] as const)
  )

  const openRequisitionIds = new Set(
    requisitions.map((row) => row.requisitionId)
  )
  const rows = requisitions.map((row) => {
    const remaining = Math.max(
      0,
      row.headcount - (hiredByRequisition.get(row.requisitionId) ?? 0)
    )
    const acceptedOfferCount = acceptedByRequisition.get(row.requisitionId) ?? 0
    return {
      requisitionId: row.requisitionId,
      departmentId: row.departmentId,
      positionId: row.positionId,
      pendingCount: Math.max(remaining, acceptedOfferCount),
      acceptedOfferCount,
    }
  })

  for (const row of acceptedOffers) {
    if (openRequisitionIds.has(row.requisitionId)) continue
    const acceptedOfferCount = Number(row.n)
    rows.push({
      requisitionId: row.requisitionId,
      departmentId: row.departmentId,
      positionId: row.positionId,
      pendingCount: acceptedOfferCount,
      acceptedOfferCount,
    })
  }

  return rows
}

export async function listPositionControlRows(
  organizationId: string,
  options: OrgStructureQueryOptions
): Promise<PositionControlRow[]> {
  const [rows, pendingHires] = await Promise.all([
    listPositionsForOrg(organizationId, options),
    listPendingHireDemand(organizationId),
  ])
  const pendingByPosition = new Map<string, number>()
  const pendingByDepartment = new Map<string, number>()
  for (const pending of pendingHires) {
    if (pending.positionId) {
      pendingByPosition.set(
        pending.positionId,
        (pendingByPosition.get(pending.positionId) ?? 0) + pending.pendingCount
      )
    } else if (pending.departmentId) {
      pendingByDepartment.set(
        pending.departmentId,
        (pendingByDepartment.get(pending.departmentId) ?? 0) +
          pending.pendingCount
      )
    }
  }
  return rows.map((row) => {
    const pendingHireCount =
      pendingByPosition.get(row.id) ??
      pendingByDepartment.get(row.departmentId) ??
      0
    // Explicit lifecycle status takes precedence over occupancy math. HRM-ORG-010.
    if (row.positionStatus === "planned") {
      return {
        ...row,
        pendingHireCount,
        availableHeadcount: null,
        headcountVariance: null,
        occupancyState: "planned",
      }
    }
    if (row.positionStatus === "frozen") {
      return {
        ...row,
        pendingHireCount,
        availableHeadcount: null,
        headcountVariance: null,
        occupancyState: "frozen",
      }
    }
    if (row.positionStatus === "closed") {
      return {
        ...row,
        pendingHireCount,
        availableHeadcount: null,
        headcountVariance: null,
        occupancyState: "closed",
      }
    }

    const budget = row.headcountBudget
    const variance = budget === null ? null : budget - row.occupancyCount
    const availableHeadcount =
      budget === null
        ? null
        : Math.max(0, budget - row.occupancyCount - pendingHireCount)
    const occupancyState: PositionControlRow["occupancyState"] =
      budget === null
        ? "unbudgeted"
        : row.occupancyCount + pendingHireCount > budget
          ? "over_budget"
          : row.occupancyCount + pendingHireCount === budget
            ? "filled"
            : "open"
    return {
      ...row,
      pendingHireCount,
      availableHeadcount,
      headcountVariance: variance,
      occupancyState,
    }
  })
}

export async function listEmployeeAssignmentHistory(
  organizationId: string,
  employeeId: string
): Promise<EmployeeAssignmentHistoryRow[]> {
  const rows = await db
    .select({
      id: hrmEmployeeAssignment.id,
      employeeId: hrmEmployeeAssignment.employeeId,
      departmentId: hrmEmployeeAssignment.departmentId,
      positionId: hrmEmployeeAssignment.positionId,
      jobGradeId: hrmEmployeeAssignment.jobGradeId,
      managerEmployeeId: hrmEmployeeAssignment.managerEmployeeId,
      costCenterCode: hrmEmployeeAssignment.costCenterCode,
      workLocationCode: hrmEmployeeAssignment.workLocationCode,
      effectiveFrom: hrmEmployeeAssignment.effectiveFrom,
      effectiveTo: hrmEmployeeAssignment.effectiveTo,
      status: hrmEmployeeAssignment.status,
      reason: hrmEmployeeAssignment.reason,
      createdAt: hrmEmployeeAssignment.createdAt,
    })
    .from(hrmEmployeeAssignment)
    .where(
      and(
        eq(hrmEmployeeAssignment.organizationId, organizationId),
        eq(hrmEmployeeAssignment.employeeId, employeeId)
      )
    )
    .orderBy(desc(hrmEmployeeAssignment.effectiveFrom))

  const [departments, positions, grades, managers] = await Promise.all([
    listDepartmentsForOrg(organizationId, { includeArchived: true }),
    listPositionsForOrg(organizationId, { includeArchived: true }),
    listJobGradesForOrg(organizationId, { includeArchived: true }),
    listEmployeeLabels(
      organizationId,
      rows
        .map((r) => r.managerEmployeeId)
        .filter((id): id is string => Boolean(id))
    ),
  ])
  const departmentMap = new Map(departments.map((d) => [d.id, d.code]))
  const positionMap = new Map(positions.map((p) => [p.id, p.code]))
  const gradeMap = new Map(grades.map((g) => [g.id, g.code]))
  const managerMap = new Map(managers.map((m) => [m.id, m.label]))

  return rows.map((row) => ({
    ...row,
    departmentCode: row.departmentId
      ? (departmentMap.get(row.departmentId) ?? null)
      : null,
    positionCode: row.positionId
      ? (positionMap.get(row.positionId) ?? null)
      : null,
    jobGradeCode: row.jobGradeId
      ? (gradeMap.get(row.jobGradeId) ?? null)
      : null,
    managerLabel: row.managerEmployeeId
      ? (managerMap.get(row.managerEmployeeId) ?? null)
      : null,
  }))
}

export async function listOrgStructureEmployeePlacements(
  organizationId: string,
  options: Partial<OrgStructureQueryOptions> = {}
): Promise<OrgStructureEmployeePlacementRow[]> {
  const queryOptions: OrgStructureQueryOptions = {
    includeArchived: false,
    ...options,
  }
  const orgUnitLookupOptions: OrgStructureQueryOptions = {
    includeArchived: true,
    asOfDate: queryOptions.asOfDate,
    includeFuture: queryOptions.includeFuture,
    legalEntityId: queryOptions.legalEntityId,
    businessUnitId: queryOptions.businessUnitId,
    departmentId: queryOptions.departmentId,
    teamId: queryOptions.teamId,
    orgUnitType: queryOptions.orgUnitType,
    orgUnitStatus: queryOptions.orgUnitStatus,
    workLocationCode: queryOptions.workLocationCode,
    costCenterCode: queryOptions.costCenterCode,
  }
  const [employees, departments, positions, grades] = await Promise.all([
    listActiveEmployeePlacements(organizationId, queryOptions),
    listDepartmentsForOrg(organizationId, orgUnitLookupOptions),
    listPositionsForOrg(organizationId, {
      ...queryOptions,
      includeArchived: true,
    }),
    listJobGradesForOrg(organizationId, { includeArchived: true }),
  ])
  const departmentMap = new Map(departments.map((d) => [d.id, d]))
  const positionMap = new Map(positions.map((p) => [p.id, p]))
  const gradeMap = new Map(grades.map((g) => [g.id, g.code]))
  const employeeMap = new Map(employees.map((e) => [e.id, e.label]))

  return employees
    .filter((employee) => {
      const department = employee.currentDepartmentId
        ? departmentMap.get(employee.currentDepartmentId)
        : null
      const position = employee.currentPositionId
        ? positionMap.get(employee.currentPositionId)
        : null

      if (queryOptions.positionId) {
        return employee.currentPositionId === queryOptions.positionId
      }
      if (queryOptions.managerEmployeeId) {
        const managerMatches =
          employee.managerEmployeeId === queryOptions.managerEmployeeId ||
          employee.dottedLineManagerId === queryOptions.managerEmployeeId ||
          employee.matrixManagerIds.includes(queryOptions.managerEmployeeId)
        if (!managerMatches) return false
      }
      if (
        (queryOptions.legalEntityId ||
          queryOptions.businessUnitId ||
          queryOptions.departmentId ||
          queryOptions.teamId) &&
        !department &&
        !position
      ) {
        return false
      }
      if (
        employee.currentDepartmentId &&
        !departmentMap.has(employee.currentDepartmentId)
      ) {
        return false
      }
      if (
        employee.currentPositionId &&
        !positionMap.has(employee.currentPositionId)
      ) {
        return false
      }
      if (
        queryOptions.workLocationCode &&
        position?.workLocationCode !== queryOptions.workLocationCode &&
        department?.workLocationCode !== queryOptions.workLocationCode
      ) {
        return false
      }
      if (
        queryOptions.costCenterCode &&
        position?.costCenterCode !== queryOptions.costCenterCode &&
        department?.costCenterCode !== queryOptions.costCenterCode
      ) {
        return false
      }
      return true
    })
    .map((employee) => ({
      id: employee.id,
      employeeNumber: employee.employeeNumber,
      label: employee.label,
      currentDepartmentId: employee.currentDepartmentId,
      departmentCode: employee.currentDepartmentId
        ? (departmentMap.get(employee.currentDepartmentId)?.code ?? null)
        : null,
      currentPositionId: employee.currentPositionId,
      positionCode: employee.currentPositionId
        ? (positionMap.get(employee.currentPositionId)?.code ?? null)
        : null,
      currentJobGradeId: employee.currentJobGradeId,
      jobGradeCode: employee.currentJobGradeId
        ? (gradeMap.get(employee.currentJobGradeId) ?? null)
        : null,
      managerEmployeeId: employee.managerEmployeeId,
      managerLabel: employee.managerEmployeeId
        ? (employeeMap.get(employee.managerEmployeeId) ?? null)
        : null,
      dottedLineManagerId: employee.dottedLineManagerId,
      dottedLineManagerLabel: employee.dottedLineManagerId
        ? (employeeMap.get(employee.dottedLineManagerId) ?? null)
        : null,
      matrixManagerIds: employee.matrixManagerIds,
      matrixManagerLabels: employee.matrixManagerIds
        .map((id) => employeeMap.get(id))
        .filter((label): label is string => Boolean(label)),
    }))
}

function summarizeOrgScope(
  id: string,
  label: string,
  orgUnits: readonly OrgUnitTreeRow[],
  positions: readonly PositionControlRow[],
  placements: readonly OrgStructureEmployeePlacementRow[]
): OrgStructureSummaryRow {
  const activePositions = positions.filter(
    (position) => position.positionStatus === "active"
  )
  const budgetedHeadcount = activePositions.reduce(
    (sum, position) => sum + (position.headcountBudget ?? 0),
    0
  )
  const occupiedHeadcount = activePositions.reduce(
    (sum, position) => sum + position.occupancyCount,
    0
  )
  const pendingHireCount = activePositions.reduce(
    (sum, position) => sum + position.pendingHireCount,
    0
  )
  const openHeadcount = activePositions.reduce(
    (sum, position) => sum + (position.availableHeadcount ?? 0),
    0
  )

  return {
    id,
    label,
    activeOrgUnitCount: orgUnits.filter(
      (unit) => unit.orgUnitStatus === "active"
    ).length,
    activePositionCount: activePositions.length,
    activeEmployeeCount: placements.length,
    budgetedHeadcount,
    occupiedHeadcount,
    pendingHireCount,
    openHeadcount,
  }
}

function buildOrgUnitSummaryRows(
  orgUnits: readonly OrgUnitTreeRow[],
  positions: readonly PositionControlRow[],
  placements: readonly OrgStructureEmployeePlacementRow[],
  unitFilter: (unit: OrgUnitTreeRow) => boolean
): OrgStructureSummaryRow[] {
  const orgUnitMap = new Map(orgUnits.map((unit) => [unit.id, unit]))
  return orgUnits.filter(unitFilter).map((unit) => {
    const scopedOrgUnits = orgUnits.filter((candidate) =>
      orgUnitIsWithin(candidate.id, unit.id, orgUnitMap)
    )
    const scopedOrgUnitIds = new Set(scopedOrgUnits.map((row) => row.id))
    const scopedPositions = positions.filter((position) =>
      scopedOrgUnitIds.has(position.departmentId)
    )
    const scopedPositionIds = new Set(scopedPositions.map((row) => row.id))
    const scopedPlacements = placements.filter(
      (placement) =>
        Boolean(
          placement.currentDepartmentId &&
          scopedOrgUnitIds.has(placement.currentDepartmentId)
        ) ||
        Boolean(
          placement.currentPositionId &&
          scopedPositionIds.has(placement.currentPositionId)
        )
    )

    return summarizeOrgScope(
      unit.id,
      `${unit.code} - ${unit.name}`,
      scopedOrgUnits,
      scopedPositions,
      scopedPlacements
    )
  })
}

function buildOrgStructureSummaries(
  orgUnits: readonly OrgUnitTreeRow[],
  positions: readonly PositionControlRow[],
  placements: readonly OrgStructureEmployeePlacementRow[]
): OrgStructureSummarySet {
  const orgUnitMap = new Map(orgUnits.map((unit) => [unit.id, unit]))
  const placementLabelMap = new Map(
    placements.map((placement) => [placement.id, placement.label])
  )

  const managerIds = [
    ...new Set(
      placements
        .map((placement) => placement.managerEmployeeId)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const locationCodes = [
    ...new Set(
      positions
        .map(
          (position) =>
            position.workLocationCode ??
            orgUnitMap.get(position.departmentId)?.workLocationCode ??
            null
        )
        .concat(orgUnits.map((unit) => unit.workLocationCode))
        .filter((code): code is string => Boolean(code))
    ),
  ]

  return {
    legalEntities: buildOrgUnitSummaryRows(
      orgUnits,
      positions,
      placements,
      (unit) => unit.orgUnitType === "legal_entity"
    ),
    businessUnits: buildOrgUnitSummaryRows(
      orgUnits,
      positions,
      placements,
      (unit) => unit.orgUnitType === "business_unit"
    ),
    departments: buildOrgUnitSummaryRows(
      orgUnits,
      positions,
      placements,
      (unit) =>
        unit.orgUnitType === "department" ||
        unit.orgUnitType === "sub_department"
    ),
    teams: buildOrgUnitSummaryRows(
      orgUnits,
      positions,
      placements,
      (unit) => unit.orgUnitType === "team"
    ),
    managers: managerIds.map((managerId) => {
      const scopedPlacements = placements.filter(
        (placement) => placement.managerEmployeeId === managerId
      )
      const scopedPositionIds = new Set(
        scopedPlacements
          .map((placement) => placement.currentPositionId)
          .filter((id): id is string => Boolean(id))
      )
      const scopedOrgUnitIds = new Set(
        scopedPlacements
          .map((placement) => placement.currentDepartmentId)
          .filter((id): id is string => Boolean(id))
      )
      const scopedPositions = positions.filter((position) =>
        scopedPositionIds.has(position.id)
      )
      const scopedOrgUnits = orgUnits.filter((unit) =>
        scopedOrgUnitIds.has(unit.id)
      )
      return summarizeOrgScope(
        managerId,
        placementLabelMap.get(managerId) ?? managerId,
        scopedOrgUnits,
        scopedPositions,
        scopedPlacements
      )
    }),
    positions: positions.map((position) => {
      const scopedPlacements = placements.filter(
        (placement) => placement.currentPositionId === position.id
      )
      const department = orgUnitMap.get(position.departmentId)
      return summarizeOrgScope(
        position.id,
        `${position.code} - ${position.title}`,
        department ? [department] : [],
        [position],
        scopedPlacements
      )
    }),
    locations: locationCodes.map((locationCode) => {
      const scopedPositions = positions.filter(
        (position) =>
          (position.workLocationCode ??
            orgUnitMap.get(position.departmentId)?.workLocationCode) ===
          locationCode
      )
      const scopedPositionIds = new Set(scopedPositions.map((row) => row.id))
      const scopedOrgUnits = orgUnits.filter(
        (unit) => unit.workLocationCode === locationCode
      )
      const scopedOrgUnitIds = new Set(scopedOrgUnits.map((row) => row.id))
      const scopedPlacements = placements.filter(
        (placement) =>
          Boolean(
            placement.currentPositionId &&
            scopedPositionIds.has(placement.currentPositionId)
          ) ||
          Boolean(
            placement.currentDepartmentId &&
            scopedOrgUnitIds.has(placement.currentDepartmentId)
          )
      )
      return summarizeOrgScope(
        locationCode,
        locationCode,
        scopedOrgUnits,
        scopedPositions,
        scopedPlacements
      )
    }),
  }
}

export async function validateOrgStructureHealth(
  organizationId: string,
  options: Partial<OrgStructureQueryOptions> = {}
): Promise<OrgStructureHealthIssue[]> {
  const queryOptions: OrgStructureQueryOptions = {
    includeArchived: false,
    ...options,
  }
  const [departments, positions, employees] = await Promise.all([
    listOrgUnitTree(organizationId, queryOptions),
    listPositionControlRows(organizationId, queryOptions),
    listActiveEmployeePlacements(organizationId, queryOptions),
  ])
  const issues: OrgStructureHealthIssue[] = []
  issues.push(...departmentCycleIssues(departments))
  issues.push(...positionCycleIssues(positions))

  for (const department of departments) {
    if (
      department.activeEmployeeCount === 0 &&
      department.activePositionCount === 0 &&
      department.childCount === 0
    ) {
      issues.push({
        id: `empty_department:${department.id}`,
        severity: "info",
        kind: "empty_department",
        title: "Empty org unit",
        detail: `${department.code} has no active employees, positions, or child org units.`,
        resourceType: "hrm_department",
        resourceId: department.id,
      })
    }
  }

  for (const position of positions) {
    if (position.occupancyState === "over_budget") {
      issues.push({
        id: `over_budget_position:${position.id}`,
        severity: "critical",
        kind: "over_budget_position",
        title: "Position over budget",
        detail: `${position.code} has ${position.occupancyCount} occupants against a budget of ${position.headcountBudget}.`,
        resourceType: "hrm_position",
        resourceId: position.id,
      })
    }
    if (!position.defaultGradeId) {
      issues.push({
        id: `missing_grade:${position.id}`,
        severity: "attention",
        kind: "missing_grade",
        title: "Position missing grade",
        detail: `${position.code} has no default job grade.`,
        resourceType: "hrm_position",
        resourceId: position.id,
      })
    }
  }

  const employeeIds = new Set(employees.map((employee) => employee.id))
  for (const employee of employees) {
    if (!employee.currentDepartmentId) {
      issues.push({
        id: `missing_department:${employee.id}`,
        severity: "attention",
        kind: "missing_department",
        title: "Employee missing org unit",
        detail: `${employee.label} has no current org unit.`,
        resourceType: "hrm_employee",
        resourceId: employee.id,
      })
    }
    if (!employee.currentPositionId) {
      issues.push({
        id: `missing_position:${employee.id}`,
        severity: "attention",
        kind: "missing_position",
        title: "Employee missing position",
        detail: `${employee.label} has no current position.`,
        resourceType: "hrm_employee",
        resourceId: employee.id,
      })
    }
    if (
      employee.managerEmployeeId &&
      !employeeIds.has(employee.managerEmployeeId)
    ) {
      issues.push({
        id: `invalid_manager:${employee.id}`,
        severity: "critical",
        kind: "invalid_manager",
        title: "Manager outside active workforce",
        detail: `${employee.label} references a manager that is not active in this organization.`,
        resourceType: "hrm_employee",
        resourceId: employee.id,
      })
    }
  }

  // Employees placed in frozen positions. HRM-ORG-010.
  const frozenPositionIds = new Set(
    positions.filter((p) => p.positionStatus === "frozen").map((p) => p.id)
  )
  for (const employee of employees) {
    if (
      employee.currentPositionId &&
      frozenPositionIds.has(employee.currentPositionId)
    ) {
      issues.push({
        id: `frozen_position_occupied:${employee.id}`,
        severity: "attention",
        kind: "frozen_position_occupied",
        title: "Employee in frozen position",
        detail: `${employee.label} is placed in a frozen position. No new placements should be accepted here.`,
        resourceType: "hrm_employee",
        resourceId: employee.id,
      })
    }
  }

  // Departments without a head employee assigned. HRM-ORG-008.
  for (const department of departments) {
    if (!department.headEmployeeId) {
      issues.push({
        id: `department_no_head:${department.id}`,
        severity: "info",
        kind: "department_no_head",
        title: "Org unit has no head",
        detail: `${department.code} has no head employee assigned.`,
        resourceType: "hrm_department",
        resourceId: department.id,
      })
    }
  }

  return issues.sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity)
  )
}

export async function listOrgStructureSnapshot(
  organizationId: string,
  options: Partial<OrgStructureQueryOptions> = {}
): Promise<OrgStructureSnapshot> {
  const queryOptions: OrgStructureQueryOptions = {
    includeArchived: false,
    ...options,
  }
  const [orgUnits, positions, grades, health, placements] = await Promise.all([
    listOrgUnitTree(organizationId, queryOptions),
    listPositionControlRows(organizationId, queryOptions),
    listJobGradesForOrg(organizationId, { includeArchived: false }),
    validateOrgStructureHealth(organizationId, queryOptions),
    listOrgStructureEmployeePlacements(organizationId, queryOptions),
  ])
  const activePositions = positions.filter(
    (row) => row.positionStatus === "active"
  )
  const budgetedHeadcount = activePositions.reduce(
    (sum, row) => sum + (row.headcountBudget ?? 0),
    0
  )
  const occupiedHeadcount = activePositions.reduce(
    (sum, row) => sum + row.occupancyCount,
    0
  )
  const pendingHireCount = activePositions.reduce(
    (sum, row) => sum + row.pendingHireCount,
    0
  )
  return {
    orgUnits,
    positions,
    grades,
    health,
    summaries: buildOrgStructureSummaries(orgUnits, positions, placements),
    totals: {
      activeOrgUnits: orgUnits.length,
      activePositions: activePositions.length,
      activeEmployees: placements.length,
      budgetedHeadcount,
      occupiedHeadcount,
      pendingHireCount,
      openHeadcount: Math.max(
        0,
        budgetedHeadcount - occupiedHeadcount - pendingHireCount
      ),
      overBudgetPositions: positions.filter(
        (row) => row.occupancyState === "over_budget"
      ).length,
      plannedPositions: positions.filter(
        (row) => row.positionStatus === "planned"
      ).length,
      frozenPositions: positions.filter(
        (row) => row.positionStatus === "frozen"
      ).length,
      closedPositions: positions.filter(
        (row) => row.positionStatus === "closed"
      ).length,
    },
  }
}

export async function countEmployeesUsingDepartment(
  organizationId: string,
  departmentId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.currentDepartmentId, departmentId),
        isNull(hrmEmployee.archivedAt)
      )
    )
  return rows.length
}

export async function countActivePositionsInDepartment(
  organizationId: string,
  departmentId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmPosition.id })
    .from(hrmPosition)
    .where(
      and(
        eq(hrmPosition.organizationId, organizationId),
        eq(hrmPosition.departmentId, departmentId),
        isNull(hrmPosition.archivedAt)
      )
    )
  return rows.length
}

export async function countEmployeesUsingPosition(
  organizationId: string,
  positionId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.currentPositionId, positionId),
        isNull(hrmEmployee.archivedAt)
      )
    )
  return rows.length
}

export async function countEmployeesUsingGrade(
  organizationId: string,
  gradeId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmEmployee.id })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.currentJobGradeId, gradeId),
        isNull(hrmEmployee.archivedAt)
      )
    )
  return rows.length
}

export async function countPositionsUsingDefaultGrade(
  organizationId: string,
  gradeId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmPosition.id })
    .from(hrmPosition)
    .where(
      and(
        eq(hrmPosition.organizationId, organizationId),
        eq(hrmPosition.defaultGradeId, gradeId),
        isNull(hrmPosition.archivedAt)
      )
    )
  return rows.length
}

async function listEmployeeLabels(
  organizationId: string,
  employeeIds: readonly string[]
): Promise<{ id: string; label: string }[]> {
  const ids = [...new Set(employeeIds)]
  if (ids.length === 0) return []
  const rows = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        inArray(hrmEmployee.id, ids)
      )
    )
  return rows.map((row) => ({
    id: row.id,
    label: `${row.employeeNumber} · ${row.legalName}`,
  }))
}

async function listActiveEmployeePlacements(
  organizationId: string,
  options: Pick<OrgStructureQueryOptions, "asOfDate" | "includeFuture"> = {}
) {
  const asOf = options.asOfDate ?? new Date()
  const [rows, assignments, relationships] = await Promise.all([
    db
      .select({
        id: hrmEmployee.id,
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
        currentDepartmentId: hrmEmployee.currentDepartmentId,
        currentPositionId: hrmEmployee.currentPositionId,
        currentJobGradeId: hrmEmployee.currentJobGradeId,
        managerEmployeeId: hrmEmployee.managerEmployeeId,
        dottedLineManagerId: hrmEmployee.dottedLineManagerId,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          isNull(hrmEmployee.archivedAt)
        )
      ),
    db
      .select({
        employeeId: hrmEmployeeAssignment.employeeId,
        currentDepartmentId: hrmEmployeeAssignment.departmentId,
        currentPositionId: hrmEmployeeAssignment.positionId,
        currentJobGradeId: hrmEmployeeAssignment.jobGradeId,
        managerEmployeeId: hrmEmployeeAssignment.managerEmployeeId,
        effectiveFrom: hrmEmployeeAssignment.effectiveFrom,
        effectiveTo: hrmEmployeeAssignment.effectiveTo,
        status: hrmEmployeeAssignment.status,
      })
      .from(hrmEmployeeAssignment)
      .where(eq(hrmEmployeeAssignment.organizationId, organizationId)),
    listEffectiveReportingRelationships(organizationId, options),
  ])

  const assignmentsByEmployee = new Map<string, typeof assignments>()
  for (const assignment of assignments) {
    const versions = assignmentsByEmployee.get(assignment.employeeId) ?? []
    versions.push(assignment)
    assignmentsByEmployee.set(assignment.employeeId, versions)
  }

  const directByEmployee = new Map<string, string>()
  const dottedByEmployee = new Map<string, string>()
  const matrixByEmployee = new Map<string, string[]>()
  for (const relationship of relationships) {
    if (relationship.relationshipType === "direct") {
      directByEmployee.set(
        relationship.employeeId,
        relationship.managerEmployeeId
      )
    } else if (relationship.relationshipType === "dotted") {
      dottedByEmployee.set(
        relationship.employeeId,
        relationship.managerEmployeeId
      )
    } else if (relationship.relationshipType === "matrix") {
      const managers = matrixByEmployee.get(relationship.employeeId) ?? []
      managers.push(relationship.managerEmployeeId)
      matrixByEmployee.set(relationship.employeeId, managers)
    }
  }

  return rows.map((row) => {
    const assignment = chooseOrgStructureVersion(
      assignmentsByEmployee.get(row.id) ?? [],
      { asOfDate: asOf, includeFuture: options.includeFuture }
    )
    return {
      ...row,
      currentDepartmentId:
        assignment?.currentDepartmentId ?? row.currentDepartmentId,
      currentPositionId: assignment?.currentPositionId ?? row.currentPositionId,
      currentJobGradeId: assignment?.currentJobGradeId ?? row.currentJobGradeId,
      managerEmployeeId:
        directByEmployee.get(row.id) ??
        assignment?.managerEmployeeId ??
        row.managerEmployeeId,
      dottedLineManagerId:
        dottedByEmployee.get(row.id) ?? row.dottedLineManagerId,
      matrixManagerIds: matrixByEmployee.get(row.id) ?? [],
      label: `${row.employeeNumber} · ${row.legalName}`,
    }
  })
}

export type EffectiveReportingRelationshipRow = {
  id: string
  employeeId: string
  managerEmployeeId: string
  relationshipType: "direct" | "dotted" | "matrix"
  effectiveFrom: Date
  effectiveTo: Date | null
  status: string
  reason: string | null
  approvalReference: string | null
}

export async function listEffectiveReportingRelationships(
  organizationId: string,
  options: Pick<OrgStructureQueryOptions, "asOfDate" | "includeFuture"> = {}
): Promise<EffectiveReportingRelationshipRow[]> {
  const asOf = options.asOfDate ?? new Date()
  const rows = await db
    .select({
      id: hrmEmployeeReportingRelationship.id,
      employeeId: hrmEmployeeReportingRelationship.employeeId,
      managerEmployeeId: hrmEmployeeReportingRelationship.managerEmployeeId,
      relationshipType: hrmEmployeeReportingRelationship.relationshipType,
      effectiveFrom: hrmEmployeeReportingRelationship.effectiveFrom,
      effectiveTo: hrmEmployeeReportingRelationship.effectiveTo,
      status: hrmEmployeeReportingRelationship.status,
      reason: hrmEmployeeReportingRelationship.reason,
      approvalReference: hrmEmployeeReportingRelationship.approvalReference,
    })
    .from(hrmEmployeeReportingRelationship)
    .where(eq(hrmEmployeeReportingRelationship.organizationId, organizationId))

  const byKey = new Map<string, typeof rows>()
  for (const row of rows) {
    const key =
      row.relationshipType === "matrix"
        ? `${row.employeeId}:${row.relationshipType}:${row.managerEmployeeId}`
        : `${row.employeeId}:${row.relationshipType}`
    const list = byKey.get(key) ?? []
    list.push(row)
    byKey.set(key, list)
  }

  return [...byKey.values()].flatMap((versions) => {
    const effective = chooseOrgStructureVersion(versions, {
      asOfDate: asOf,
      includeFuture: options.includeFuture,
    })
    if (!effective) return []
    if (effective.status !== "active") return []
    if (
      effective.relationshipType === "direct" ||
      effective.relationshipType === "dotted" ||
      effective.relationshipType === "matrix"
    ) {
      return [effective as EffectiveReportingRelationshipRow]
    }
    return []
  })
}

function departmentDepth(
  departmentId: string,
  departmentMap: ReadonlyMap<string, DepartmentListRow>
): number {
  let depth = 0
  const visited = new Set<string>()
  let current = departmentMap.get(departmentId)
  while (current?.parentDepartmentId) {
    if (visited.has(current.parentDepartmentId)) return depth
    visited.add(current.parentDepartmentId)
    const parent = departmentMap.get(current.parentDepartmentId)
    if (!parent) return depth
    depth += 1
    current = parent
  }
  return depth
}

function departmentCycleIssues(
  departments: readonly OrgUnitTreeRow[]
): OrgStructureHealthIssue[] {
  const map = new Map(departments.map((d) => [d.id, d]))
  return departments.flatMap((department) => {
    const visited = new Set<string>()
    let current: OrgUnitTreeRow | undefined = department
    while (current?.parentDepartmentId) {
      if (visited.has(current.parentDepartmentId)) {
        return [
          {
            id: `department_cycle:${department.id}`,
            severity: "critical" as const,
            kind: "department_cycle" as const,
            title: "Org unit hierarchy cycle",
            detail: `${department.code} participates in a parent org unit cycle.`,
            resourceType: "hrm_department" as const,
            resourceId: department.id,
          },
        ]
      }
      visited.add(current.parentDepartmentId)
      current = map.get(current.parentDepartmentId)
    }
    return []
  })
}

function positionCycleIssues(
  positions: readonly PositionControlRow[]
): OrgStructureHealthIssue[] {
  const map = new Map(positions.map((p) => [p.id, p]))
  return positions.flatMap((position) => {
    const visited = new Set<string>()
    let current: PositionControlRow | undefined = position
    while (current?.reportsToPositionId) {
      if (visited.has(current.reportsToPositionId)) {
        return [
          {
            id: `position_cycle:${position.id}`,
            severity: "critical" as const,
            kind: "position_cycle" as const,
            title: "Position reporting cycle",
            detail: `${position.code} participates in a reports-to cycle.`,
            resourceType: "hrm_position" as const,
            resourceId: position.id,
          },
        ]
      }
      visited.add(current.reportsToPositionId)
      current = map.get(current.reportsToPositionId)
    }
    return []
  })
}

function severityRank(severity: OrgStructureHealthIssue["severity"]): number {
  if (severity === "critical") return 3
  if (severity === "attention") return 2
  return 1
}

/**
 * Walks the direct-line manager chain from `employeeId` upward.
 * Returns the chain ordered from immediate manager (depth 1) to root.
 * Terminates on cycle detection or missing manager.
 * Fulfils HRM-ORG-021 (approval routing) and HRM-ORG-022 (escalation path).
 */
export async function listOrgReportingChain(
  organizationId: string,
  employeeId: string,
  options: Pick<OrgStructureQueryOptions, "asOfDate" | "includeFuture"> = {}
): Promise<OrgReportingChainRow[]> {
  const [allRows, relationships] = await Promise.all([
    db
      .select({
        id: hrmEmployee.id,
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
        managerEmployeeId: hrmEmployee.managerEmployeeId,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          isNull(hrmEmployee.archivedAt)
        )
      ),
    listEffectiveReportingRelationships(organizationId, options),
  ])

  const employeeMap = new Map(allRows.map((r) => [r.id, r]))
  const directManagerMap = new Map(
    relationships
      .filter((row) => row.relationshipType === "direct")
      .map((row) => [row.employeeId, row.managerEmployeeId] as const)
  )
  const chain: OrgReportingChainRow[] = []
  const visited = new Set<string>([employeeId])
  let cursor =
    directManagerMap.get(employeeId) ??
    employeeMap.get(employeeId)?.managerEmployeeId
  let depth = 1

  while (cursor) {
    if (visited.has(cursor)) break
    visited.add(cursor)
    const manager = employeeMap.get(cursor)
    if (!manager) break
    chain.push({
      employeeId: manager.id,
      label: `${manager.employeeNumber} · ${manager.legalName}`,
      depth,
    })
    cursor = directManagerMap.get(manager.id) ?? manager.managerEmployeeId
    depth++
  }

  return chain
}

/**
 * Groups active employees by their direct-line manager.
 * Returns headcount and affected department IDs per manager.
 * Fulfils HRM-ORG-019 headcount visibility by manager.
 */
export async function listOrgStructureHeadcountByManager(
  organizationId: string,
  options: Pick<OrgStructureQueryOptions, "asOfDate" | "includeFuture"> = {}
): Promise<OrgHeadcountByManagerRow[]> {
  const employees = await listActiveEmployeePlacements(organizationId, options)
  const managerLabels = new Map(employees.map((e) => [e.id, e.label]))

  const managerMap = new Map<
    string | null,
    { count: number; depts: Set<string> }
  >()

  for (const employee of employees) {
    const key = employee.managerEmployeeId
    const entry = managerMap.get(key) ?? { count: 0, depts: new Set() }
    entry.count++
    if (employee.currentDepartmentId)
      entry.depts.add(employee.currentDepartmentId)
    managerMap.set(key, entry)
  }

  return [...managerMap.entries()].map(([managerId, { count, depts }]) => ({
    managerEmployeeId: managerId,
    managerLabel: managerId ? (managerLabels.get(managerId) ?? null) : null,
    directReportCount: count,
    departmentIds: [...depts],
  }))
}

/**
 * Builds flat rows suitable for CSV export of the full org structure.
 * Each row covers one (org-unit → position → employee) tuple.
 * Rows with no position are org-unit-only; rows with position but no employee are vacancies.
 * Fulfils HRM-ORG-023 (search, filter, export).
 */
export function buildOrgStructureExportRows(
  snapshot: OrgStructureSnapshot,
  placements: OrgStructureEmployeePlacementRow[]
): OrgStructureExportRow[] {
  const deptMap = new Map(snapshot.orgUnits.map((u) => [u.id, u]))
  const placementsByPosition = new Map<
    string,
    OrgStructureEmployeePlacementRow[]
  >()
  const unassigned: OrgStructureEmployeePlacementRow[] = []

  for (const p of placements) {
    if (p.currentPositionId) {
      const list = placementsByPosition.get(p.currentPositionId) ?? []
      list.push(p)
      placementsByPosition.set(p.currentPositionId, list)
    } else {
      unassigned.push(p)
    }
  }

  const rows: OrgStructureExportRow[] = []

  for (const unit of snapshot.orgUnits) {
    const dept = deptMap.get(unit.id)
    const parentCode = unit.parentDepartmentId
      ? (deptMap.get(unit.parentDepartmentId)?.code ?? null)
      : null
    const unitPositions = snapshot.positions.filter(
      (p) => p.departmentId === unit.id
    )

    if (unitPositions.length === 0) {
      rows.push({
        orgUnitCode: unit.code,
        orgUnitName: unit.name,
        parentOrgUnitCode: parentCode,
        costCenterCode: unit.costCenterCode,
        workLocationCode: dept?.workLocationCode ?? null,
        positionCode: null,
        positionTitle: null,
        positionHeadcountBudget: null,
        positionOccupancyCount: 0,
        occupancyState: null,
        employeeNumber: null,
        employeeLabel: null,
        managerLabel: null,
        dottedLineManagerLabel: null,
        matrixManagerLabels: null,
        orgUnitType: unit.orgUnitType,
        orgUnitStatus: unit.orgUnitStatus,
        positionStatus: null,
        pendingHireCount: 0,
        openHeadcountAfterPending: null,
        effectiveFrom: unit.effectiveFrom,
        effectiveTo: unit.effectiveTo,
        reason: unit.reason,
        approvalReference: unit.approvalReference,
      })
      continue
    }

    for (const position of unitPositions) {
      const positionPlacements = placementsByPosition.get(position.id) ?? []
      if (positionPlacements.length === 0) {
        rows.push({
          orgUnitCode: unit.code,
          orgUnitName: unit.name,
          parentOrgUnitCode: parentCode,
          costCenterCode: unit.costCenterCode,
          workLocationCode: dept?.workLocationCode ?? null,
          positionCode: position.code,
          positionTitle: position.title,
          positionHeadcountBudget: position.headcountBudget,
          positionOccupancyCount: position.occupancyCount,
          occupancyState: position.occupancyState,
          employeeNumber: null,
          employeeLabel: null,
          managerLabel: null,
          dottedLineManagerLabel: null,
          matrixManagerLabels: null,
          orgUnitType: unit.orgUnitType,
          orgUnitStatus: unit.orgUnitStatus,
          positionStatus: position.positionStatus,
          pendingHireCount: position.pendingHireCount,
          openHeadcountAfterPending: position.availableHeadcount,
          effectiveFrom: position.effectiveFrom ?? unit.effectiveFrom,
          effectiveTo: position.effectiveTo ?? unit.effectiveTo,
          reason: position.reason ?? unit.reason,
          approvalReference:
            position.approvalReference ?? unit.approvalReference,
        })
      } else {
        for (const placement of positionPlacements) {
          rows.push({
            orgUnitCode: unit.code,
            orgUnitName: unit.name,
            parentOrgUnitCode: parentCode,
            costCenterCode: unit.costCenterCode,
            workLocationCode: dept?.workLocationCode ?? null,
            positionCode: position.code,
            positionTitle: position.title,
            positionHeadcountBudget: position.headcountBudget,
            positionOccupancyCount: position.occupancyCount,
            occupancyState: position.occupancyState,
            employeeNumber: placement.employeeNumber,
            employeeLabel: placement.label,
            managerLabel: placement.managerLabel,
            dottedLineManagerLabel: placement.dottedLineManagerLabel,
            matrixManagerLabels:
              placement.matrixManagerLabels.length > 0
                ? placement.matrixManagerLabels.join("; ")
                : null,
            orgUnitType: unit.orgUnitType,
            orgUnitStatus: unit.orgUnitStatus,
            positionStatus: position.positionStatus,
            pendingHireCount: position.pendingHireCount,
            openHeadcountAfterPending: position.availableHeadcount,
            effectiveFrom: position.effectiveFrom ?? unit.effectiveFrom,
            effectiveTo: position.effectiveTo ?? unit.effectiveTo,
            reason: position.reason ?? unit.reason,
            approvalReference:
              position.approvalReference ?? unit.approvalReference,
          })
        }
      }
    }
  }

  for (const placement of unassigned) {
    const dept = placement.currentDepartmentId
      ? deptMap.get(placement.currentDepartmentId)
      : null
    rows.push({
      orgUnitCode: dept?.code ?? "",
      orgUnitName: dept?.name ?? "",
      parentOrgUnitCode: dept?.parentDepartmentId
        ? (deptMap.get(dept.parentDepartmentId)?.code ?? null)
        : null,
      costCenterCode: dept?.costCenterCode ?? null,
      workLocationCode: dept?.workLocationCode ?? null,
      positionCode: null,
      positionTitle: null,
      positionHeadcountBudget: null,
      positionOccupancyCount: 0,
      occupancyState: null,
      employeeNumber: placement.employeeNumber,
      employeeLabel: placement.label,
      managerLabel: placement.managerLabel,
      dottedLineManagerLabel: placement.dottedLineManagerLabel,
      matrixManagerLabels:
        placement.matrixManagerLabels.length > 0
          ? placement.matrixManagerLabels.join("; ")
          : null,
      orgUnitType: dept?.orgUnitType ?? null,
      orgUnitStatus: dept?.orgUnitStatus ?? null,
      positionStatus: null,
      pendingHireCount: 0,
      openHeadcountAfterPending: null,
      effectiveFrom: dept?.effectiveFrom ?? null,
      effectiveTo: dept?.effectiveTo ?? null,
      reason: dept?.reason ?? null,
      approvalReference: dept?.approvalReference ?? null,
    })
  }

  return rows
}

export async function listOrgChartNodes(
  organizationId: string,
  options: OrgStructureQueryOptions
): Promise<readonly OrgChartNode[]> {
  const [orgUnits, positions, placements] = await Promise.all([
    listOrgUnitTree(organizationId, options),
    listPositionControlRows(organizationId, options),
    listOrgStructureEmployeePlacements(organizationId, options),
  ])

  const nodes: OrgChartNode[] = []

  for (const unit of orgUnits) {
    const parentId = unit.parentDepartmentId ?? ORG_CHART_ROOT_ID
    nodes.push({
      id: `dept:${unit.id}`,
      kind: "department",
      parentId,
      label: unit.name,
      secondaryLabel: unit.code,
      resourceId: unit.id,
    })
  }

  for (const position of positions) {
    const budgeted = position.headcountBudget
    const occupied = position.occupancyCount
    const open = position.availableHeadcount
    nodes.push({
      id: `pos:${position.id}`,
      kind: "position",
      parentId: `dept:${position.departmentId}`,
      label: position.title,
      secondaryLabel: position.code,
      resourceId: position.id,
      headcount: {
        budgeted,
        occupied,
        open,
      },
    })
  }

  const employeesByPosition = new Map<
    string,
    OrgStructureEmployeePlacementRow[]
  >()
  for (const placement of placements) {
    if (!placement.currentPositionId) continue
    const list = employeesByPosition.get(placement.currentPositionId) ?? []
    list.push(placement)
    employeesByPosition.set(placement.currentPositionId, list)
  }

  for (const [positionId, employees] of employeesByPosition) {
    for (const employee of employees) {
      nodes.push({
        id: `emp:${employee.id}`,
        kind: "employee",
        parentId: `pos:${positionId}`,
        label: employee.label,
        secondaryLabel: employee.employeeNumber,
        resourceId: employee.id,
      })
    }
  }

  return nodes
}
