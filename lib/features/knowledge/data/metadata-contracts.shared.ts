import { z } from "zod"

export const retrievalModeSchema = z.enum(["cosine", "hybrid", "hybrid_rerank"])

export type RetrievalMode = z.infer<typeof retrievalModeSchema>

export const evalRunCaseMetadataSchema = z.object({
  caseId: z.string().min(1),
  question: z.string().min(1),
  expectedEvidenceIds: z.array(z.string()),
  retrievedEvidenceIds: z.array(z.string()),
  hit: z.boolean(),
  reciprocalRank: z.number(),
})

export type EvalRunCaseMetadata = z.infer<typeof evalRunCaseMetadataSchema>

export const knowledgeEvalRunMetadataSchema = z.object({
  cases: z.array(evalRunCaseMetadataSchema),
  retrievalMode: retrievalModeSchema,
  topK: z.number().int().min(1).max(30),
})

export type KnowledgeEvalRunMetadata = z.infer<
  typeof knowledgeEvalRunMetadataSchema
>

export const iamAuditEvalRunMetadataSchema = z.object({
  runId: z.string().min(1),
  topK: z.number().int().min(1).max(30),
  totalCases: z.number().int().nonnegative(),
  recallAtK: z.number(),
  meanReciprocalRank: z.number(),
  evidenceOverlap: z.number(),
  retrievalMode: retrievalModeSchema,
})

export type IamAuditEvalRunMetadata = z.infer<
  typeof iamAuditEvalRunMetadataSchema
>

export const iamAuditSourceSyncMetadataSchema = z.object({
  runId: z.string().min(1),
  sourceId: z.string().min(1),
  documentsTotal: z.number().int().nonnegative(),
  documentsChanged: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  reason: z.string().optional(),
})

export type IamAuditSourceSyncMetadata = z.infer<
  typeof iamAuditSourceSyncMetadataSchema
>

export const knowledgeOrgCredentialMetadataSchema = z.object({
  providerLabel: z.string().optional(),
  lastFailureReason: z.string().optional(),
})

export type KnowledgeOrgCredentialMetadata = z.infer<
  typeof knowledgeOrgCredentialMetadataSchema
>
