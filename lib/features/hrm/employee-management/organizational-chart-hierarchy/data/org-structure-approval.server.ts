import "server-only"

import { and, eq, inArray, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

import { listOrgReportingChain } from "./org-structure.queries.server"

const DEFAULT_ESCALATION_DEPTH = 8

export async function resolveManagerApproverUserId(input: {
  readonly organizationId: string
  readonly managerEmployeeId: string | null
}): Promise<string | null> {
  if (!input.managerEmployeeId) return null

  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, input.organizationId),
      eq(hrmEmployee.id, input.managerEmployeeId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: { linkedUserId: true },
  })

  return row?.linkedUserId ?? null
}

/**
 * Resolves the approver user id at `level` in the direct reporting chain (1 = immediate manager).
 * HRM-ORG-021.
 */
export async function resolveOrgReportingApproverUserId(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly level?: number
}): Promise<string | null> {
  const level = Math.max(1, input.level ?? 1)
  const chain = await listOrgReportingChain(input.organizationId, input.employeeId)
  const manager = chain.find((row) => row.depth === level)
  if (!manager) return null
  return resolveManagerApproverUserId({
    organizationId: input.organizationId,
    managerEmployeeId: manager.employeeId,
  })
}

/**
 * Ordered escalation approver user ids walking the manager chain (HRM-ORG-022).
 */
export async function resolveOrgEscalationApproverUserIds(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly maxDepth?: number
}): Promise<readonly string[]> {
  const maxDepth = input.maxDepth ?? DEFAULT_ESCALATION_DEPTH
  const chain = await listOrgReportingChain(input.organizationId, input.employeeId)
  const links = chain.filter((link) => link.depth <= maxDepth)
  if (links.length === 0) return []

  const managerIds = links.map((link) => link.employeeId)
  const managers = await db
    .select({
      id: hrmEmployee.id,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        inArray(hrmEmployee.id, managerIds),
        isNull(hrmEmployee.archivedAt)
      )
    )

  const linkedUserIdByManagerId = new Map(
    managers.map((row) => [row.id, row.linkedUserId] as const)
  )

  const userIds: string[] = []
  for (const link of links) {
    const userId = linkedUserIdByManagerId.get(link.employeeId)
    if (userId && !userIds.includes(userId)) {
      userIds.push(userId)
    }
  }

  return userIds
}
