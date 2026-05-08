import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { iamAuditEvent } from "#lib/db/schema"

import { KNOWLEDGE_AUDIT_ACTIONS } from "../constants"

export type SyncRunState =
  | "running"
  | "completed"
  | "failed"
  | "cancel_requested"

export type SourceSyncRunRow = {
  runId: string
  sourceId: string
  startedAt: Date
  completedAt: Date | null
  state: SyncRunState
  error?: string
}

function parseMetadata(metadata: string | null): Record<string, unknown> {
  if (!metadata) return {}
  try {
    const parsed = JSON.parse(metadata)
    if (parsed && typeof parsed === "object")
      return parsed as Record<string, unknown>
    return {}
  } catch {
    return {}
  }
}

export async function listSourceSyncRunsForOrganization(
  organizationId: string
): Promise<SourceSyncRunRow[]> {
  const rows = await db
    .select()
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.organizationId, organizationId),
        inArray(iamAuditEvent.action, [
          KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_START,
          KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_COMPLETE,
          KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_FAIL,
          KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_CANCEL,
        ])
      )
    )
    .orderBy(desc(iamAuditEvent.createdAt))
    .limit(200)

  const byRun = new Map<string, SourceSyncRunRow>()
  for (const row of rows) {
    const metadata = parseMetadata(row.metadata)
    const sourceId = String(metadata.sourceId ?? row.resourceId ?? "")
    if (!sourceId) continue
    const runId = String(
      metadata.runId ?? `${sourceId}:${row.createdAt.toISOString()}`
    )
    const existing = byRun.get(runId)
    if (row.action === KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_START) {
      if (!existing) {
        byRun.set(runId, {
          runId,
          sourceId,
          startedAt: row.createdAt,
          completedAt: null,
          state: "running",
        })
      }
      continue
    }

    const base =
      existing ??
      ({
        runId,
        sourceId,
        startedAt: row.createdAt,
        completedAt: null,
        state: "running",
      } satisfies SourceSyncRunRow)

    if (row.action === KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_COMPLETE) {
      base.state = "completed"
      base.completedAt = row.createdAt
    } else if (row.action === KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_FAIL) {
      base.state = "failed"
      base.completedAt = row.createdAt
      const message = metadata.message
      if (typeof message === "string" && message.length > 0) {
        base.error = message
      }
    } else if (row.action === KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_CANCEL) {
      base.state = "cancel_requested"
      base.completedAt = row.createdAt
    }

    byRun.set(runId, base)
  }

  return [...byRun.values()].sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
  )
}
