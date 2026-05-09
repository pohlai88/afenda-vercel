"use server"

import { after } from "next/server"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { requireOrgSession } from "#lib/tenant"

import { KNOWLEDGE_AUDIT_ACTIONS } from "#features/knowledge/constants"
import type { EvalRunSummary } from "#features/knowledge/types"

import { runKnowledgeEvalSetInputSchema } from "../schemas/source.schema"
import { listEvalCasesForSet } from "../data/eval.queries.server"
import { summarizeEvalScores } from "../data/eval-metrics.shared"
import { hybridRetrieveKnowledge } from "../data/retrieve-hybrid.server"
import { embedKnowledgeText } from "../data/embeddings.server"
import { getCachedKnowledgeOrgSetting } from "../data/settings.queries.server"
import { insertKnowledgeEvalRun } from "../data/eval-run.mutations.server"
import type {
  IamAuditEvalRunMetadata,
  RetrievalMode,
} from "../data/metadata-contracts.shared"

export type RunKnowledgeEvalSetState =
  | undefined
  | { ok: true; summary: EvalRunSummary }
  | { ok: false; error: string }

export async function runKnowledgeEvalSetAction(
  _prev: RunKnowledgeEvalSetState,
  formData: FormData
): Promise<RunKnowledgeEvalSetState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, error: "Admin role required." }

  const parsed = runKnowledgeEvalSetInputSchema.safeParse({
    evalSetId: formData.get("evalSetId"),
    topK: Number(formData.get("topK") ?? 8),
  })
  if (!parsed.success) return { ok: false, error: "Invalid eval payload." }

  const cases = await listEvalCasesForSet(
    session.organizationId,
    parsed.data.evalSetId
  )
  const startedAt = Date.now()
  const hybridEnabled = process.env.LYNX_RETRIEVAL_HYBRID === "1"
  const orgSetting = await getCachedKnowledgeOrgSetting(session.organizationId)
  const retrievalMode: RetrievalMode =
    hybridEnabled && orgSetting?.retrievalHybridEnabled ? "hybrid" : "cosine"

  const scores = []
  for (const row of cases) {
    const queryEmbedding = await embedKnowledgeText(row.question)
    const hits = await hybridRetrieveKnowledge({
      organizationId: session.organizationId,
      query: row.question,
      queryEmbedding,
      topK: parsed.data.topK,
      rerankEnabled: false,
    })
    scores.push({
      expectedEvidenceIds: row.expectedEvidenceIds,
      retrievedEvidenceIds: hits.map((hit) => hit.id),
      caseId: row.id,
      question: row.question,
    })
  }

  const summary = summarizeEvalScores(scores, parsed.data.topK)
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
    organizationId: session.organizationId,
    evalSetId: parsed.data.evalSetId,
    createdByUserId: session.userId,
    topK: parsed.data.topK,
    retrievalMode,
    durationMs: Date.now() - startedAt,
    summary,
    metadata: {
      cases: metadataCases,
      retrievalMode,
      topK: parsed.data.topK,
    },
  })
  const auditMetadata: IamAuditEvalRunMetadata = {
    runId,
    topK: parsed.data.topK,
    totalCases: summary.totalCases,
    recallAtK: summary.recallAtK,
    meanReciprocalRank: summary.meanReciprocalRank,
    evidenceOverlap: summary.evidenceOverlap,
    retrievalMode,
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: KNOWLEDGE_AUDIT_ACTIONS.EVAL_RUN,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "knowledge.eval_set",
      resourceId: parsed.data.evalSetId,
      metadata: auditMetadata,
    })
  )

  return { ok: true, summary }
}

export async function runKnowledgeEvalSetFormAction(
  formData: FormData
): Promise<void> {
  void (await runKnowledgeEvalSetAction(undefined, formData))
}
