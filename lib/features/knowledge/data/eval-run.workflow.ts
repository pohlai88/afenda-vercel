import type { KnowledgeEvalRunPayload } from "#features/execution"
import { writeIamAuditEvent } from "#lib/auth"

import { KNOWLEDGE_AUDIT_ACTIONS } from "../constants"

import { insertKnowledgeEvalRun } from "./eval-run.mutations.server"
import { listEvalCasesForSet } from "./eval.queries.server"
import { summarizeEvalScores } from "./eval-metrics.shared"
import { embedKnowledgeText } from "./embeddings.server"
import { findSimilarKnowledgeChunks } from "./knowledge-chunk.queries"
import { getCachedKnowledgeOrgSetting } from "./settings.queries.server"
import { hybridRetrieveKnowledge } from "./retrieve-hybrid.server"
import type {
  IamAuditEvalRunMetadata,
  RetrievalMode,
} from "./metadata-contracts.shared"

export async function runKnowledgeEvalWorkflow(
  payload: KnowledgeEvalRunPayload
) {
  "use workflow"

  const { summary, runId, retrievalMode } = await evalRunStep(payload)
  await auditStep(payload, summary, runId, retrievalMode)
}

async function evalRunStep(payload: KnowledgeEvalRunPayload) {
  "use step"
  const startedAt = Date.now()
  const orgSetting = await getCachedKnowledgeOrgSetting(payload.organizationId)
  const useHybrid =
    process.env.LYNX_RETRIEVAL_HYBRID === "1" &&
    Boolean(orgSetting?.retrievalHybridEnabled)
  const retrievalMode: RetrievalMode = useHybrid ? "hybrid" : "cosine"

  const cases = await listEvalCasesForSet(
    payload.organizationId,
    payload.evalSetId
  )
  const scores = []
  for (const row of cases) {
    const queryEmbedding = await embedKnowledgeText(row.question)
    const hits = useHybrid
      ? await hybridRetrieveKnowledge({
          organizationId: payload.organizationId,
          query: row.question,
          queryEmbedding,
          topK: payload.topK,
          rerankEnabled: false,
        })
      : await findSimilarKnowledgeChunks(
          payload.organizationId,
          queryEmbedding,
          payload.topK
        )
    scores.push({
      expectedEvidenceIds: row.expectedEvidenceIds,
      retrievedEvidenceIds: hits.map((hit) => hit.id),
      caseId: row.id,
      question: row.question,
    })
  }
  const summary = summarizeEvalScores(scores, payload.topK)
  const metadataCases = scores.map((score) => ({
    caseId: score.caseId,
    question: score.question,
    expectedEvidenceIds: score.expectedEvidenceIds,
    retrievedEvidenceIds: score.retrievedEvidenceIds,
    hit: score.expectedEvidenceIds.some((id) =>
      score.retrievedEvidenceIds.includes(id)
    ),
    reciprocalRank: 0,
  }))
  for (const item of metadataCases) {
    const hitIndex = item.retrievedEvidenceIds.findIndex((id) =>
      item.expectedEvidenceIds.includes(id)
    )
    item.reciprocalRank = hitIndex >= 0 ? 1 / (hitIndex + 1) : 0
  }
  const runId = await insertKnowledgeEvalRun({
    organizationId: payload.organizationId,
    evalSetId: payload.evalSetId,
    createdByUserId: payload.actorUserId ?? null,
    topK: payload.topK,
    retrievalMode,
    durationMs: Date.now() - startedAt,
    summary,
    metadata: {
      cases: metadataCases,
      retrievalMode,
      topK: payload.topK,
    },
  })
  return { summary, runId, retrievalMode }
}

async function auditStep(
  payload: KnowledgeEvalRunPayload,
  summary: ReturnType<typeof summarizeEvalScores>,
  runId: string,
  retrievalMode: RetrievalMode
) {
  "use step"
  const metadata: IamAuditEvalRunMetadata = {
    runId,
    topK: payload.topK,
    totalCases: summary.totalCases,
    recallAtK: summary.recallAtK,
    meanReciprocalRank: summary.meanReciprocalRank,
    evidenceOverlap: summary.evidenceOverlap,
    retrievalMode,
  }
  await writeIamAuditEvent({
    action: KNOWLEDGE_AUDIT_ACTIONS.EVAL_RUN,
    organizationId: payload.organizationId,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    resourceType: "knowledge.eval_set",
    resourceId: payload.evalSetId,
    metadata,
  })
}
