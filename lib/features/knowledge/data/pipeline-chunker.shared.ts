export type ChunkedKnowledgeText = {
  index: number
  title: string
  body: string
  tokenCount: number
}

const WORDS_PER_TOKEN = 0.75
const DEFAULT_TARGET_TOKENS = 512
const DEFAULT_OVERLAP_TOKENS = 64

function estimateTokenCount(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / WORDS_PER_TOKEN))
}

/**
 * Lightweight deterministic chunking by word windows.
 * This stays intentionally simple; quality upgrades should be centralized here.
 */
export function chunkKnowledgeDocument(args: {
  title: string
  body: string
  targetTokens?: number
  overlapTokens?: number
}): ChunkedKnowledgeText[] {
  const targetTokens = args.targetTokens ?? DEFAULT_TARGET_TOKENS
  const overlapTokens = Math.min(
    args.overlapTokens ?? DEFAULT_OVERLAP_TOKENS,
    targetTokens - 1
  )
  const words = args.body.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return [
      {
        index: 0,
        title: args.title,
        body: args.body,
        tokenCount: estimateTokenCount(args.body),
      },
    ]
  }

  const wordsPerChunk = Math.max(1, Math.floor(targetTokens * WORDS_PER_TOKEN))
  const overlapWords = Math.max(0, Math.floor(overlapTokens * WORDS_PER_TOKEN))
  const step = Math.max(1, wordsPerChunk - overlapWords)

  const out: ChunkedKnowledgeText[] = []
  for (let start = 0; start < words.length; start += step) {
    const end = Math.min(words.length, start + wordsPerChunk)
    const body = words.slice(start, end).join(" ")
    out.push({
      index: out.length,
      title: args.title,
      body,
      tokenCount: estimateTokenCount(body),
    })
    if (end >= words.length) break
  }
  return out
}
