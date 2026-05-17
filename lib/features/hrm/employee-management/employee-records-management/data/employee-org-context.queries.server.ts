import "server-only"

import { and, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDepartment, hrmEmployeeAssignment } from "#lib/db/schema"

import type { EmployeeOrgContextReference } from "../../../types"

type OrgUnitRole =
  | "legal_entity"
  | "business_unit"
  | "department"
  | "team"
  | "location"

type DepartmentNode = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly orgUnitType: string
  readonly parentDepartmentId: string | null
}

function toPlacementOption(node: DepartmentNode) {
  return {
    id: node.id,
    code: node.code,
    label: node.name,
    secondaryLabel: node.orgUnitType,
  }
}

function resolveRole(
  nodes: DepartmentNode[],
  role: OrgUnitRole
): DepartmentNode | null {
  if (role === "department") {
    return (
      nodes.find((node) => node.orgUnitType === "department") ??
      nodes.find((node) => node.orgUnitType === "sub_department") ??
      null
    )
  }
  return nodes.find((node) => node.orgUnitType === role) ?? null
}

async function loadDepartmentChain(
  organizationId: string,
  departmentId: string
): Promise<DepartmentNode[]> {
  const byId = new Map<string, DepartmentNode>()
  const rows = await db
    .select({
      id: hrmDepartment.id,
      code: hrmDepartment.code,
      name: hrmDepartment.name,
      orgUnitType: hrmDepartment.orgUnitType,
      parentDepartmentId: hrmDepartment.parentDepartmentId,
    })
    .from(hrmDepartment)
    .where(eq(hrmDepartment.organizationId, organizationId))

  for (const row of rows) {
    byId.set(row.id, row)
  }

  const chain: DepartmentNode[] = []
  let cursor: string | null = departmentId
  const seen = new Set<string>()

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    const node = byId.get(cursor)
    if (!node) break
    chain.push(node)
    cursor = node.parentDepartmentId
  }

  return chain
}

/** Walks department ancestors to derive legal entity / BU / team / branch refs (HRM-EMP-REC-009). */
export async function resolveEmployeeOrgContextReference(input: {
  readonly organizationId: string
  readonly departmentId: string | null
  readonly employeeId: string
}): Promise<EmployeeOrgContextReference> {
  const empty: EmployeeOrgContextReference = {
    legalEntity: null,
    businessUnit: null,
    department: null,
    team: null,
    branch: null,
    workLocationCode: null,
    costCenterCode: null,
  }

  const [activeAssignment] = await db
    .select({
      costCenterCode: hrmEmployeeAssignment.costCenterCode,
      workLocationCode: hrmEmployeeAssignment.workLocationCode,
    })
    .from(hrmEmployeeAssignment)
    .where(
      and(
        eq(hrmEmployeeAssignment.organizationId, input.organizationId),
        eq(hrmEmployeeAssignment.employeeId, input.employeeId),
        isNull(hrmEmployeeAssignment.effectiveTo)
      )
    )
    .orderBy(desc(hrmEmployeeAssignment.effectiveFrom))
    .limit(1)

  if (!input.departmentId) {
    return {
      ...empty,
      workLocationCode: activeAssignment?.workLocationCode ?? null,
      costCenterCode: activeAssignment?.costCenterCode ?? null,
    }
  }

  const chain = await loadDepartmentChain(
    input.organizationId,
    input.departmentId
  )

  const legalEntity = resolveRole(chain, "legal_entity")
  const businessUnit = resolveRole(chain, "business_unit")
  const department = resolveRole(chain, "department")
  const team = resolveRole(chain, "team")
  const branch = resolveRole(chain, "location")

  return {
    legalEntity: legalEntity ? toPlacementOption(legalEntity) : null,
    businessUnit: businessUnit ? toPlacementOption(businessUnit) : null,
    department: department ? toPlacementOption(department) : null,
    team: team ? toPlacementOption(team) : null,
    branch: branch ? toPlacementOption(branch) : null,
    workLocationCode: activeAssignment?.workLocationCode ?? null,
    costCenterCode: activeAssignment?.costCenterCode ?? null,
  }
}
