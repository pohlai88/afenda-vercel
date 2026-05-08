import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { knowledgeEvalRun } from "#lib/db/schema"

import {
  knowledgeEvalRunMetadataSchema,
  retrievalModeSchema,
} from "./metadata-contracts.shared"
import type { EvalRunDetail, EvalRunHistoryRow } from "../types"

function toNumber(value: string | number | null): number {
  if (typeof value === "number") return value
  if (!value) return 0
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function mapRow(row: typeof knowledgeEvalRun.$inferSelect): EvalRunHistoryRow {
  const retrievalMode = retrievalModeSchema.safeParse(row.retrievalMode)
  return {
    id: row.id,
    evalSetId: row.evalSetId,
    topK: row.topK,
    retrievalMode: retrievalMode.success ? retrievalMode.data : "cosine",
    totalCases: row.totalCases,
    recallAtK: toNumber(row.recallAtK),
    meanReciprocalRank: toNumber(row.meanReciprocalRank),
    evidenceOverlap: toNumber(row.evidenceOverlap),
    durationMs: row.durationMs,
    createdAt: row.createdAt,
  }
}

export async function listEvalRunsForOrganization(args: {
  organizationId: string
  evalSetId?: string
  limit?: number
}): Promise<EvalRunHistoryRow[]> {
  const where = args.evalSetId
    ? and(
        eq(knowledgeEvalRun.organizationId, args.organizationId),
        eq(knowledgeEvalRun.evalSetId, args.evalSetId)
      )
    : eq(knowledgeEvalRun.organizationId, args.organizationId)

  const rows = await db
    .select()
    .from(knowledgeEvalRun)
    .where(where)
    .orderBy(desc(knowledgeEvalRun.createdAt))
    .limit(args.limit ?? 30)

  return rows.map(mapRow)
}

export async function getEvalRunById(
  organizationId: string,
  runId: string
): Promise<EvalRunDetail | null> {
  const [row] = await db
    .select()
    .from(knowledgeEvalRun)
    .where(
      and(
        eq(knowledgeEvalRun.organizationId, organizationId),
        eq(knowledgeEvalRun.id, runId)
      )
    )
    .limit(1)
  if (!row) return null

  const metadata = knowledgeEvalRunMetadataSchema.safeParse(row.metadata)
  const base = mapRow(row)
  return {
    ...base,
    cases: metadata.success ? metadata.data.cases : [],
  }
}

export async function listEvalRunCasesForRun(
  organizationId: string,
  runId: string
) {
  const detail = await getEvalRunById(organizationId, runId)
  return detail?.cases ?? []
}
