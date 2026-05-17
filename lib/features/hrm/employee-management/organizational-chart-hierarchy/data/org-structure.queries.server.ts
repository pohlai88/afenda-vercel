import "server-only"

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm"

import { ORG_CHART_ROOT_ID, type OrgChartNode } from "./org-chart.shared"
import { isOrgRecordEffectiveAsOf } from "./org-structure-effective.shared"

import { db } from "#lib/db"
import {
  hrmDepartment,
  hrmEmployee,
  hrmEmployeeAssignment,
  hrmJobGrade,
  hrmPosition,
} from "#lib/db/schema"

export type DepartmentListRow = {
  id: string
  code: string
  name: string
  /** Structural type — "legal_entity" | "business_unit" | "department" | "sub_department" | "team" | "location". HRM-ORG-002. */
  orgUnitType: string
  parentDepartmentId: string | null
  headEmployeeId: string | null
  costCenterCode: string | null
  workLocationCode: string | null
  /** When this org unit structure becomes effective; null = immediate. HRM-ORG-012/014. */
  effectiveFrom: Date | null
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
  totals: {
    activeOrgUnits: number
    activePositions: number
    activeEmployees: number
    budgetedHeadcount: number
    occupiedHeadcount: number
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
}

function filterOrgRowsByAsOf<
  T extends { effectiveFrom: Date | null; archivedAt: Date | null },
>(rows: readonly T[], asOfDate: Date | undefined): T[] {
  if (!asOfDate) return [...rows]
  return rows.filter(
    (row) =>
      isOrgRecordEffectiveAsOf(row.effectiveFrom, asOfDate) &&
      (row.archivedAt === null || row.archivedAt.getTime() > asOfDate.getTime())
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
  const rows = await db
    .select({
      id: hrmDepartment.id,
      code: hrmDepartment.code,
      name: hrmDepartment.name,
      orgUnitType: hrmDepartment.orgUnitType,
      parentDepartmentId: hrmDepartment.parentDepartmentId,
      headEmployeeId: hrmDepartment.headEmployeeId,
      costCenterCode: hrmDepartment.costCenterCode,
      workLocationCode: hrmDepartment.workLocationCode,
      effectiveFrom: hrmDepartment.effectiveFrom,
      archivedAt: hrmDepartment.archivedAt,
    })
    .from(hrmDepartment)
    .where(
      options.includeArchived
        ? eq(hrmDepartment.organizationId, organizationId)
        : and(
            eq(hrmDepartment.organizationId, organizationId),
            isNull(hrmDepartment.archivedAt)
          )
    )
    .orderBy(asc(hrmDepartment.code))
  return filterOrgRowsByAsOf(rows, options.asOfDate)
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
  const [positions, departments, grades, employees] = await Promise.all([
    db
      .select({
        id: hrmPosition.id,
        code: hrmPosition.code,
        title: hrmPosition.title,
        departmentId: hrmPosition.departmentId,
        defaultGradeId: hrmPosition.defaultGradeId,
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
        options.includeArchived
          ? eq(hrmPosition.organizationId, organizationId)
          : and(
              eq(hrmPosition.organizationId, organizationId),
              isNull(hrmPosition.archivedAt)
            )
      )
      .orderBy(asc(hrmPosition.code)),
    listDepartmentsForOrg(organizationId, { includeArchived: true }),
    listJobGradesForOrg(organizationId, { includeArchived: true }),
    listActiveEmployeePlacements(organizationId),
  ])

  const deptMap = new Map(departments.map((d) => [d.id, d.code]))
  const gradeMap = new Map(grades.map((g) => [g.id, g.code]))
  const positionCodeMap = new Map(positions.map((p) => [p.id, p.code]))
  const occupancy = new Map<string, number>()
  for (const employee of employees) {
    if (!employee.currentPositionId) continue
    occupancy.set(
      employee.currentPositionId,
      (occupancy.get(employee.currentPositionId) ?? 0) + 1
    )
  }

  const mapped = positions.map((p) => ({
    ...p,
    departmentCode: deptMap.get(p.departmentId) ?? null,
    defaultGradeCode: p.defaultGradeId
      ? (gradeMap.get(p.defaultGradeId) ?? null)
      : null,
    reportsToPositionCode: p.reportsToPositionId
      ? (positionCodeMap.get(p.reportsToPositionId) ?? null)
      : null,
    occupancyCount: occupancy.get(p.id) ?? 0,
  }))
  return filterOrgRowsByAsOf(mapped, options.asOfDate)
}

export async function listOrgUnitTree(
  organizationId: string,
  options: OrgStructureQueryOptions
): Promise<OrgUnitTreeRow[]> {
  const [departments, positions, employees] = await Promise.all([
    listDepartmentsForOrg(organizationId, options),
    listPositionsForOrg(organizationId, { includeArchived: true }),
    listActiveEmployeePlacements(organizationId),
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

export async function listPositionControlRows(
  organizationId: string,
  options: OrgStructureQueryOptions
): Promise<PositionControlRow[]> {
  const rows = await listPositionsForOrg(organizationId, options)
  return rows.map((row) => {
    // Explicit lifecycle status takes precedence over occupancy math. HRM-ORG-010.
    if (row.positionStatus === "planned") {
      return { ...row, headcountVariance: null, occupancyState: "planned" }
    }
    if (row.positionStatus === "frozen") {
      return { ...row, headcountVariance: null, occupancyState: "frozen" }
    }
    if (row.positionStatus === "closed") {
      return { ...row, headcountVariance: null, occupancyState: "closed" }
    }

    const budget = row.headcountBudget
    const variance = budget === null ? null : budget - row.occupancyCount
    const occupancyState: PositionControlRow["occupancyState"] =
      budget === null
        ? "unbudgeted"
        : row.occupancyCount > budget
          ? "over_budget"
          : row.occupancyCount === budget
            ? "filled"
            : "open"
    return {
      ...row,
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
  organizationId: string
): Promise<OrgStructureEmployeePlacementRow[]> {
  const [employees, departments, positions, grades] = await Promise.all([
    listActiveEmployeePlacements(organizationId),
    listDepartmentsForOrg(organizationId, { includeArchived: true }),
    listPositionsForOrg(organizationId, { includeArchived: true }),
    listJobGradesForOrg(organizationId, { includeArchived: true }),
  ])
  const departmentMap = new Map(departments.map((d) => [d.id, d.code]))
  const positionMap = new Map(positions.map((p) => [p.id, p.code]))
  const gradeMap = new Map(grades.map((g) => [g.id, g.code]))
  const employeeMap = new Map(employees.map((e) => [e.id, e.label]))

  return employees.map((employee) => ({
    id: employee.id,
    employeeNumber: employee.employeeNumber,
    label: employee.label,
    currentDepartmentId: employee.currentDepartmentId,
    departmentCode: employee.currentDepartmentId
      ? (departmentMap.get(employee.currentDepartmentId) ?? null)
      : null,
    currentPositionId: employee.currentPositionId,
    positionCode: employee.currentPositionId
      ? (positionMap.get(employee.currentPositionId) ?? null)
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
  }))
}

export async function validateOrgStructureHealth(
  organizationId: string
): Promise<OrgStructureHealthIssue[]> {
  const [departments, positions, employees] = await Promise.all([
    listOrgUnitTree(organizationId, { includeArchived: false }),
    listPositionControlRows(organizationId, { includeArchived: false }),
    listActiveEmployeePlacements(organizationId),
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
    positions
      .filter((p) => p.positionStatus === "frozen")
      .map((p) => p.id)
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
  organizationId: string
): Promise<OrgStructureSnapshot> {
  const [orgUnits, positions, grades, health, employees] = await Promise.all([
    listOrgUnitTree(organizationId, { includeArchived: false }),
    listPositionControlRows(organizationId, { includeArchived: false }),
    listJobGradesForOrg(organizationId, { includeArchived: false }),
    validateOrgStructureHealth(organizationId),
    listActiveEmployeePlacements(organizationId),
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
  return {
    orgUnits,
    positions,
    grades,
    health,
    totals: {
      activeOrgUnits: orgUnits.length,
      activePositions: activePositions.length,
      activeEmployees: employees.length,
      budgetedHeadcount,
      occupiedHeadcount,
      openHeadcount: Math.max(0, budgetedHeadcount - occupiedHeadcount),
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

async function listActiveEmployeePlacements(organizationId: string) {
  const rows = await db
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
    )
  return rows.map((row) => ({
    ...row,
    label: `${row.employeeNumber} · ${row.legalName}`,
  }))
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
  employeeId: string
): Promise<OrgReportingChainRow[]> {
  const allRows = await db
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
    )

  const employeeMap = new Map(allRows.map((r) => [r.id, r]))
  const chain: OrgReportingChainRow[] = []
  const visited = new Set<string>([employeeId])
  let cursor = employeeMap.get(employeeId)?.managerEmployeeId
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
    cursor = manager.managerEmployeeId
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
  organizationId: string
): Promise<OrgHeadcountByManagerRow[]> {
  const employees = await listActiveEmployeePlacements(organizationId)
  const managerLabels = new Map(employees.map((e) => [e.id, e.label]))

  const managerMap = new Map<
    string | null,
    { count: number; depts: Set<string> }
  >()

  for (const employee of employees) {
    const key = employee.managerEmployeeId
    const entry = managerMap.get(key) ?? { count: 0, depts: new Set() }
    entry.count++
    if (employee.currentDepartmentId) entry.depts.add(employee.currentDepartmentId)
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
  const placementsByPosition = new Map<string, OrgStructureEmployeePlacementRow[]>()
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
    listOrgStructureEmployeePlacements(organizationId),
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
    const open = budgeted === null ? null : Math.max(0, budgeted - occupied)
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
