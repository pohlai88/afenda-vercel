import type { SimilarChunkRow } from "#features/knowledge"

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
