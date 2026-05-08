import type { SimilarChunkRow } from "#features/knowledge"

import { LYNX_OPERATOR_TOOL_IDS } from "./constants"

/** Serializable evidence row returned in NDJSON meta (truth search). */
export type LynxTruthEvidenceDTO = Pick<
  SimilarChunkRow,
  "id" | "title" | "body" | "distance"
>

export type LynxTruthNdjsonMeta = {
  type: "evidence"
  evidence: LynxTruthEvidenceDTO[]
  limitationsPreamble: string
}

export type LynxTruthNdjsonDelta = {
  type: "delta"
  delta: string
}

/** Streamed after deltas when generation fails mid-stream (client can show a message). */
export type LynxTruthNdjsonError = {
  type: "error"
  message: string
}

export type LynxOperatorToolId = (typeof LYNX_OPERATOR_TOOL_IDS)[number]

/** Operator stream — first NDJSON line (then deltas reuse {@link LynxTruthNdjsonDelta}). */
export type LynxOperatorNdjsonMeta = {
  type: "meta"
  layer: "operator"
  tools: readonly LynxOperatorToolId[]
}

/** Per-tool telemetry line (optional for older clients). */
export type LynxOperatorNdjsonTool = {
  type: "tool"
  id: string
  status: "called" | "completed"
  durationMs?: number
}

/** Evidence shape returned by `org_search_knowledge` (provenance-ready). */
export type LynxOperatorEvidenceHit = {
  id: string
  title: string
  excerpt: string
  distance: number
  sourceType: "knowledge_chunk"
  sourceId: string
  updatedAt: string
}

/** IAM audit metadata entry — no args, payloads, or PII. */
export type LynxOperatorAuditToolCall = {
  toolId: string
  startedAt: string
  completedAt: string
  durationMs: number
  success: boolean
  /** Stable machine code for failures — e.g. `EMBED_UNAVAILABLE`, `TOOL_ERROR`. */
  errorCode?: string
}
