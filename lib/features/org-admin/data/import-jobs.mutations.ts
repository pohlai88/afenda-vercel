import "server-only"

import { and, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import { importJob, importJobFailure, importJobRow } from "#lib/db/schema"

import type {
  OrgImportAdapterId,
  OrgImportJobState,
  OrgImportJobSummary,
  OrgImportRowState,
} from "../types"

/** Insert a job + all staged rows in a single transaction. */
export async function insertImportJob(input: {
  organizationId: string
  adapter: OrgImportAdapterId
  state: OrgImportJobState
  totalRows: number
  inputDigest: string
  createdByUserId: string | null
  metadata: Record<string, unknown> | null
  rows: ReadonlyArray<{
    rowIndex: number
    payload: Record<string, unknown>
    state: OrgImportRowState
  }>
  /** Job-level failures created during parsing (e.g. validation errors). */
  failures: ReadonlyArray<{
    rowIndex?: number
    code: string
    message: string
    field?: string
  }>
}): Promise<{ jobId: string; rowIdByIndex: Map<number, string> }> {
  return db.transaction(async (tx) => {
    const [jobRow] = await tx
      .insert(importJob)
      .values({
        organizationId: input.organizationId,
        adapter: input.adapter,
        state: input.state,
        totalRows: input.totalRows,
        successCount: 0,
        failureCount: input.failures.filter((f) => f.rowIndex == null).length,
        inputDigest: input.inputDigest,
        createdByUserId: input.createdByUserId,
        metadata: input.metadata,
      })
      .returning({ id: importJob.id })

    const rowIdByIndex = new Map<number, string>()
    if (input.rows.length > 0) {
      const inserted = await tx
        .insert(importJobRow)
        .values(
          input.rows.map((row) => ({
            jobId: jobRow.id,
            rowIndex: row.rowIndex,
            payload: row.payload,
            state: row.state,
          }))
        )
        .returning({ id: importJobRow.id, rowIndex: importJobRow.rowIndex })
      for (const r of inserted) rowIdByIndex.set(r.rowIndex, r.id)
    }

    if (input.failures.length > 0) {
      await tx.insert(importJobFailure).values(
        input.failures.map((f) => ({
          jobId: jobRow.id,
          rowId:
            f.rowIndex != null ? (rowIdByIndex.get(f.rowIndex) ?? null) : null,
          code: f.code,
          message: f.message,
          field: f.field,
        }))
      )
    }

    return { jobId: jobRow.id, rowIdByIndex }
  })
}

/** Update job state and counters (e.g. transition to running / completed). */
export async function updateImportJobState(input: {
  organizationId: string
  jobId: string
  state: OrgImportJobState
  successDelta?: number
  failureDelta?: number
  completedAt?: Date | null
}): Promise<OrgImportJobSummary | null> {
  const setClause: Record<string, unknown> = {
    state: input.state,
    updatedAt: new Date(),
  }
  if (input.successDelta) {
    setClause.successCount = sql`${importJob.successCount} + ${input.successDelta}`
  }
  if (input.failureDelta) {
    setClause.failureCount = sql`${importJob.failureCount} + ${input.failureDelta}`
  }
  if (input.completedAt !== undefined) {
    setClause.completedAt = input.completedAt
  }

  const [row] = await db
    .update(importJob)
    .set(setClause)
    .where(
      and(
        eq(importJob.id, input.jobId),
        eq(importJob.organizationId, input.organizationId)
      )
    )
    .returning()

  if (!row) return null
  return {
    id: row.id,
    organizationId: row.organizationId,
    adapter: row.adapter as OrgImportAdapterId,
    state: row.state as OrgImportJobState,
    totalRows: row.totalRows,
    successCount: row.successCount,
    failureCount: row.failureCount,
    inputDigest: row.inputDigest,
    createdByUserId: row.createdByUserId,
    metadata: row.metadata,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  }
}

/**
 * Mark a row applied/failed/skipped and capture the resource it produced.
 * `appendFailure` records adapter error detail in `import_job_failure`.
 */
export async function markImportRowApplied(input: {
  rowId: string
  resourceType?: string
  resourceId?: string
}): Promise<void> {
  await db
    .update(importJobRow)
    .set({
      state: "applied",
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      updatedAt: new Date(),
    })
    .where(eq(importJobRow.id, input.rowId))
}

export async function markImportRowFailed(input: {
  rowId: string
}): Promise<void> {
  await db
    .update(importJobRow)
    .set({ state: "failed", updatedAt: new Date() })
    .where(eq(importJobRow.id, input.rowId))
}

export async function appendImportFailure(input: {
  jobId: string
  rowId?: string | null
  code: string
  message: string
  field?: string | null
}): Promise<void> {
  await db.insert(importJobFailure).values({
    jobId: input.jobId,
    rowId: input.rowId ?? null,
    code: input.code,
    message: input.message,
    field: input.field ?? null,
  })
}
