import "server-only"

import { and, asc, count, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { importJob, importJobFailure, importJobRow } from "#lib/db/schema"

import {
  isImportAdapterId,
  isImportJobState,
  isImportRowState,
} from "../constants"
import type {
  OrgImportJobFailureSummary,
  OrgImportJobRowSummary,
  OrgImportJobSummary,
} from "../types"

/** Count of jobs still in-flight (`uploaded` waiting to run, or `running`). */
export async function countActiveImportJobsForOrganization(
  organizationId: string
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(importJob)
    .where(
      and(
        eq(importJob.organizationId, organizationId),
        inArray(importJob.state, ["uploaded", "running"])
      )
    )
  return Number(row?.n ?? 0)
}

/** Lists jobs for an organization (newest first). */
export async function listOrgImportJobs(
  organizationId: string,
  limit = 20
): Promise<OrgImportJobSummary[]> {
  const rows = await db
    .select()
    .from(importJob)
    .where(eq(importJob.organizationId, organizationId))
    .orderBy(desc(importJob.createdAt))
    .limit(limit)

  return rows.map(toJobSummary)
}

/** Loads a job scoped to its organization (IDOR-safe). */
export async function getOrgImportJob(
  organizationId: string,
  jobId: string
): Promise<OrgImportJobSummary | null> {
  const [row] = await db
    .select()
    .from(importJob)
    .where(
      and(eq(importJob.organizationId, organizationId), eq(importJob.id, jobId))
    )
    .limit(1)
  return row ? toJobSummary(row) : null
}

/** Pending rows for a job, ordered by their original CSV row index. */
export async function listPendingJobRows(
  jobId: string
): Promise<OrgImportJobRowSummary[]> {
  const rows = await db
    .select()
    .from(importJobRow)
    .where(
      and(eq(importJobRow.jobId, jobId), eq(importJobRow.state, "pending"))
    )
    .orderBy(asc(importJobRow.rowIndex))

  return rows.map(toRowSummary)
}

/** All rows for a job (used by the workbench summary UI). */
export async function listJobRows(
  jobId: string,
  limit = 200
): Promise<OrgImportJobRowSummary[]> {
  const rows = await db
    .select()
    .from(importJobRow)
    .where(eq(importJobRow.jobId, jobId))
    .orderBy(asc(importJobRow.rowIndex))
    .limit(limit)

  return rows.map(toRowSummary)
}

/** Failures for a job, newest first. */
export async function listJobFailures(
  jobId: string,
  limit = 100
): Promise<OrgImportJobFailureSummary[]> {
  const rows = await db
    .select()
    .from(importJobFailure)
    .where(eq(importJobFailure.jobId, jobId))
    .orderBy(desc(importJobFailure.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    id: row.id,
    jobId: row.jobId,
    rowId: row.rowId,
    code: row.code,
    message: row.message,
    field: row.field,
    createdAt: row.createdAt,
  }))
}

function toJobSummary(row: typeof importJob.$inferSelect): OrgImportJobSummary {
  return {
    id: row.id,
    organizationId: row.organizationId,
    adapter: isImportAdapterId(row.adapter) ? row.adapter : "member_invite",
    state: isImportJobState(row.state) ? row.state : "failed",
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

function toRowSummary(
  row: typeof importJobRow.$inferSelect
): OrgImportJobRowSummary {
  return {
    id: row.id,
    jobId: row.jobId,
    rowIndex: row.rowIndex,
    payload: row.payload,
    state: isImportRowState(row.state) ? row.state : "failed",
    resourceType: row.resourceType,
    resourceId: row.resourceId,
  }
}
