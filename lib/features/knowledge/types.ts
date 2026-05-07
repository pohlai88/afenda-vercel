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
}

export type SearchSimilarFormState =
  | undefined
  | { ok: true; rows: SimilarChunkRow[] }
  | { ok: false; errors: { query?: string; form?: string } }
