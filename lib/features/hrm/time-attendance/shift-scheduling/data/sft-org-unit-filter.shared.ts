import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDepartment } from "#lib/db/schema"

export type DepartmentParentMap = ReadonlyMap<string, string | null>

export async function loadDepartmentParentMap(
  organizationId: string
): Promise<DepartmentParentMap> {
  const rows = await db
    .select({
      id: hrmDepartment.id,
      parentDepartmentId: hrmDepartment.parentDepartmentId,
    })
    .from(hrmDepartment)
    .where(eq(hrmDepartment.organizationId, organizationId))

  return new Map(rows.map((row) => [row.id, row.parentDepartmentId]))
}

export function departmentIdWithinOrgUnitAncestor(input: {
  readonly departmentId: string | null | undefined
  readonly ancestorOrgUnitId: string
  readonly parentMap: DepartmentParentMap
}): boolean {
  const departmentId = input.departmentId?.trim() ?? ""
  if (!departmentId) return false

  const seen = new Set<string>()
  let cursor: string | null = departmentId

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    if (cursor === input.ancestorOrgUnitId) return true
    cursor = input.parentMap.get(cursor) ?? null
  }

  return false
}

export function collectDescendantDepartmentIds(input: {
  readonly rootOrgUnitId: string
  readonly parentMap: DepartmentParentMap
}): ReadonlySet<string> {
  const childrenByParent = new Map<string, string[]>()
  for (const [id, parentId] of input.parentMap) {
    if (!parentId) continue
    const siblings = childrenByParent.get(parentId) ?? []
    siblings.push(id)
    childrenByParent.set(parentId, siblings)
  }

  const ids = new Set<string>([input.rootOrgUnitId])
  const queue = [input.rootOrgUnitId]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) continue
    const children = childrenByParent.get(current) ?? []
    for (const childId of children) {
      if (ids.has(childId)) continue
      ids.add(childId)
      queue.push(childId)
    }
  }

  return ids
}

export type OrgUnitDepartmentNode = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly orgUnitType: string | null
  readonly parentDepartmentId: string | null
}

/** Walk ancestors until a legal_entity org unit is found (for roster CSV labels). */
export function resolveLegalEntityLabelForDepartment(input: {
  readonly departmentId: string | null | undefined
  readonly departmentsById: ReadonlyMap<string, OrgUnitDepartmentNode>
}): string {
  const departmentId = input.departmentId?.trim() ?? ""
  if (!departmentId) return ""

  const seen = new Set<string>()
  let cursor: string | null = departmentId

  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    const node = input.departmentsById.get(cursor)
    if (!node) return ""
    if (node.orgUnitType === "legal_entity") {
      return `${node.code} · ${node.name}`
    }
    cursor = node.parentDepartmentId
  }

  return ""
}

export function employeeMatchesOrgUnitSubtree(input: {
  readonly currentDepartmentId: string | null
  readonly assignmentDepartmentId: string | null
  readonly orgUnitId: string
  readonly parentMap: DepartmentParentMap
}): boolean {
  return (
    departmentIdWithinOrgUnitAncestor({
      departmentId: input.currentDepartmentId,
      ancestorOrgUnitId: input.orgUnitId,
      parentMap: input.parentMap,
    }) ||
    departmentIdWithinOrgUnitAncestor({
      departmentId: input.assignmentDepartmentId,
      ancestorOrgUnitId: input.orgUnitId,
      parentMap: input.parentMap,
    })
  )
}
