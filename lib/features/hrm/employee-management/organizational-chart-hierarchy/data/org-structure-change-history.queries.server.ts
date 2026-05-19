import "server-only"

import { and, desc, eq, lt } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmOrgStructureChangeHistory } from "#lib/db/schema"

import type { HrmOrgStructureResourceType } from "./org-structure-change-history.shared"

export type OrgStructureChangeHistoryRow = {
  id: string
  resourceType: string
  resourceId: string
  fieldName: string
  oldValue: unknown
  newValue: unknown
  changedByUserId: string
  changedAt: Date
  effectiveDate: Date | null
  reason: string | null
  approvalReference: string | null
}

const DEFAULT_PAGE_SIZE = 40
const MAX_PAGE_SIZE = 200

export async function listOrgStructureChangeHistory(input: {
  readonly organizationId: string
  readonly resourceType: HrmOrgStructureResourceType
  readonly resourceId: string
  readonly limit?: number
  readonly cursor?: string | null
}): Promise<{
  readonly rows: readonly OrgStructureChangeHistoryRow[]
  readonly nextCursor: string | null
}> {
  const limit = Math.min(
    Math.max(input.limit ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  )
  const fetchLimit = limit + 1
  const cursorDate = input.cursor ? new Date(input.cursor) : null

  const rows = await db
    .select({
      id: hrmOrgStructureChangeHistory.id,
      resourceType: hrmOrgStructureChangeHistory.resourceType,
      resourceId: hrmOrgStructureChangeHistory.resourceId,
      fieldName: hrmOrgStructureChangeHistory.fieldName,
      oldValue: hrmOrgStructureChangeHistory.oldValue,
      newValue: hrmOrgStructureChangeHistory.newValue,
      changedByUserId: hrmOrgStructureChangeHistory.changedByUserId,
      changedAt: hrmOrgStructureChangeHistory.changedAt,
      effectiveDate: hrmOrgStructureChangeHistory.effectiveDate,
      reason: hrmOrgStructureChangeHistory.reason,
      approvalReference: hrmOrgStructureChangeHistory.approvalReference,
    })
    .from(hrmOrgStructureChangeHistory)
    .where(
      and(
        eq(hrmOrgStructureChangeHistory.organizationId, input.organizationId),
        eq(hrmOrgStructureChangeHistory.resourceType, input.resourceType),
        eq(hrmOrgStructureChangeHistory.resourceId, input.resourceId),
        ...(cursorDate
          ? [lt(hrmOrgStructureChangeHistory.changedAt, cursorDate)]
          : [])
      )
    )
    .orderBy(desc(hrmOrgStructureChangeHistory.changedAt))
    .limit(fetchLimit)

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor =
    hasMore && page.length > 0
      ? page[page.length - 1]!.changedAt.toISOString()
      : null

  return { rows: page, nextCursor }
}
