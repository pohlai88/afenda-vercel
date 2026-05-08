import "server-only"

import { db } from "#lib/db"
import { knowledgeEvalRun } from "#lib/db/schema"

import type {
  KnowledgeEvalRunMetadata,
  RetrievalMode,
} from "./metadata-contracts.shared"
import type { EvalRunSummary } from "../types"

export async function insertKnowledgeEvalRun(args: {
  organizationId: string
  evalSetId: string
  createdByUserId: string | null
  topK: number
  retrievalMode: RetrievalMode
  durationMs: number
  summary: EvalRunSummary
  metadata: KnowledgeEvalRunMetadata
}) {
  const [row] = await db
    .insert(knowledgeEvalRun)
    .values({
      organizationId: args.organizationId,
      evalSetId: args.evalSetId,
      createdByUserId: args.createdByUserId,
      topK: args.topK,
      retrievalMode: args.retrievalMode,
      totalCases: args.summary.totalCases,
      recallAtK: String(args.summary.recallAtK),
      meanReciprocalRank: String(args.summary.meanReciprocalRank),
      evidenceOverlap: String(args.summary.evidenceOverlap),
      durationMs: args.durationMs,
      metadata: args.metadata,
    })
    .returning({ id: knowledgeEvalRun.id })
  return row.id
}
