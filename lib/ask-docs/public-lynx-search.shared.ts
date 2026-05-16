export type PublicLynxSearchHitDoc = {
  url?: string
  title?: string
}

export function publicLynxSearchResultCount(output: unknown): number {
  return Array.isArray(output) ? output.length : 0
}

/**
 * Normalizes flexsearch `enrich` hits and plain doc rows for the Ask Lynx UI.
 */
export function publicLynxSearchHits(
  output: unknown
): PublicLynxSearchHitDoc[] {
  if (!Array.isArray(output)) return []

  return output.flatMap((item) => {
    if (item && typeof item === "object" && "doc" in item) {
      const doc = (item as { doc?: PublicLynxSearchHitDoc }).doc
      return doc ? [doc] : []
    }
    if (item && typeof item === "object" && "url" in item) {
      return [item as PublicLynxSearchHitDoc]
    }
    return []
  })
}
