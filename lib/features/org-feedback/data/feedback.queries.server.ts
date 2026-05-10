import "server-only"

import { and, count, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { orgFeedbackEvent } from "#lib/db/schema"

import { FEEDBACK_INBOX_PAGE_SIZE, FEEDBACK_STATES } from "../constants"
import type {
  OrgFeedbackEventSummary,
  OrgFeedbackListResult,
  OrgFeedbackListStateFilter,
} from "../types"

function toIso(d: Date | null): string | null {
  return d ? d.toISOString() : null
}

function rowToSummary(row: typeof orgFeedbackEvent.$inferSelect): OrgFeedbackEventSummary {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    actorUserId: row.actorUserId,
    category: row.category,
    severity: row.severity,
    message: row.message,
    path: row.path,
    state: row.state as OrgFeedbackEventSummary["state"],
    acknowledgedByUserId: row.acknowledgedByUserId,
    acknowledgedAt: toIso(row.acknowledgedAt),
    resolvedByUserId: row.resolvedByUserId,
    resolvedAt: toIso(row.resolvedAt),
    resolutionNote: row.resolutionNote,
  }
}

export function parseOrgFeedbackListStateFilter(
  raw: string | undefined
): OrgFeedbackListStateFilter {
  if (!raw || raw === "all") return "all"
  if ((FEEDBACK_STATES as readonly string[]).includes(raw)) {
    return raw as OrgFeedbackListStateFilter
  }
  return "all"
}

export async function listOrgFeedbackEvents(input: {
  organizationId: string
  page: number
  pageSize?: number
  stateFilter: OrgFeedbackListStateFilter
}): Promise<OrgFeedbackListResult> {
  const pageSize = input.pageSize ?? FEEDBACK_INBOX_PAGE_SIZE
  const page = Math.max(1, input.page)

  const whereBase =
    input.stateFilter === "all"
      ? eq(orgFeedbackEvent.organizationId, input.organizationId)
      : and(
          eq(orgFeedbackEvent.organizationId, input.organizationId),
          eq(orgFeedbackEvent.state, input.stateFilter)
        )

  const [countRow] = await db
    .select({ n: count() })
    .from(orgFeedbackEvent)
    .where(whereBase)

  const totalCount = Number(countRow?.n ?? 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const offset = (safePage - 1) * pageSize

  const rows = await db
    .select()
    .from(orgFeedbackEvent)
    .where(whereBase)
    .orderBy(desc(orgFeedbackEvent.createdAt))
    .limit(pageSize)
    .offset(offset)

  return {
    items: rows.map(rowToSummary),
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  }
}
