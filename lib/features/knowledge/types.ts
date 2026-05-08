import type {
  EvalRunCaseMetadata,
  RetrievalMode,
} from "./data/metadata-contracts.shared"

export type IngestChunkFormState =
  | undefined
  | { ok: true }
  | {
      ok: false
      errors: { title?: string; body?: string; form?: string }
    }

export type SimilarChunkRow = {
  id: string
  title: string
  body: string
  distance: number
  /** Chunk creation time (used for provenance / recency in Lynx tools). */
  createdAt: Date
}

export type SearchSimilarFormState =
  | undefined
  | { ok: true; rows: SimilarChunkRow[] }
  | { ok: false; errors: { query?: string; form?: string } }

export type EvalRunHistoryRow = {
  id: string
  evalSetId: string
  topK: number
  retrievalMode: RetrievalMode
  totalCases: number
  recallAtK: number
  meanReciprocalRank: number
  evidenceOverlap: number
  durationMs: number
  createdAt: Date
}

export type EvalRunDetail = EvalRunHistoryRow & {
  cases: EvalRunCaseMetadata[]
}

export type EvalRunSummary = {
  totalCases: number
  recallAtK: number
  meanReciprocalRank: number
  evidenceOverlap: number
}

export type EvalCaseSummary = {
  id: string
  question: string
  expectedEvidenceIds: string[]
}

export type RawKnowledgeDocument = {
  externalId: string
  title: string
  body: string
}

export type HybridRetrievalRow = {
  id: string
  title: string
  body: string
  createdAt: Date
  distance: number
  lexicalScore: number
  semanticRank: number
  lexicalRank: number
  fusedRank: number
}

export type KnowledgeSourceSummary = {
  id: string
  organizationId: string
  kind: string
  name: string
  config: Record<string, unknown>
  enabled: boolean
  lastSyncedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export type KnowledgeSourceActionState =
  | undefined
  | { ok: true; sourceId?: string }
  | {
      ok: false
      errors: { kind?: string; name?: string; form?: string }
    }

export type KnowledgeSourceSyncActionState =
  | undefined
  | { ok: true; enqueued?: boolean }
  | { ok: false; errors: { form?: string } }
