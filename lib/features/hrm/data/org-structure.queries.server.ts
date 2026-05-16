import "server-only"

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm"

import { ORG_CHART_ROOT_ID, type OrgChartNode } from "./org-chart.shared"

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
  parentDepartmentId: string | null
  headEmployeeId: string | null
  costCenterCode: string | null
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
  occupancyState: "open" | "filled" | "over_budget" | "unbudgeted"
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
  }
}

export async function listDepartmentsForOrg(
  organizationId: string,
  options: { includeArchived: boolean }
): Promise<DepartmentListRow[]> {
  return db
    .select({
      id: hrmDepartment.id,
      code: hrmDepartment.code,
      name: hrmDepartment.name,
      parentDepartmentId: hrmDepartment.parentDepartmentId,
      headEmployeeId: hrmDepartment.headEmployeeId,
      costCenterCode: hrmDepartment.costCenterCode,
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
  options: { includeArchived: boolean }
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

  return positions.map((p) => ({
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
}

export async function listOrgUnitTree(
  organizationId: string,
  options: { includeArchived: boolean }
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
  options: { includeArchived: boolean }
): Promise<PositionControlRow[]> {
  const rows = await listPositionsForOrg(organizationId, options)
  return rows.map((row) => {
    const budget = row.headcountBudget
    const variance = budget === null ? null : budget - row.occupancyCount
    const occupancyState =
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
  const budgetedHeadcount = positions.reduce(
    (sum, row) => sum + (row.headcountBudget ?? 0),
    0
  )
  const occupiedHeadcount = positions.reduce(
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
      activePositions: positions.length,
      activeEmployees: employees.length,
      budgetedHeadcount,
      occupiedHeadcount,
      openHeadcount: Math.max(0, budgetedHeadcount - occupiedHeadcount),
      overBudgetPositions: positions.filter(
        (row) => row.occupancyState === "over_budget"
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

export async function listOrgChartNodes(
  organizationId: string,
  options: { includeArchived: boolean }
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
