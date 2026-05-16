import "server-only"

import {
  DEFAULT_CHAT_MODEL,
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_LYNX_FALLBACKS,
  resolveLanguageModel,
} from "#lib/ai/gateway.server"

export type AiExecutionClass =
  | "public_chat"
  | "docs_search_answer"
  | "truth_generation"
  | "embeddings"
  | "admin_testing"

export interface ResolvedModelPolicy {
  primary: string
  fallbacks: readonly string[]
}

/**
 * Per-execution-class model routing policy (Gateway ids, not direct provider SDK).
 * `truth_generation` omits fallbacks unless `AFENDA_AI_EMERGENCY_FALLBACK=1`.
 */
export function resolveLanguageModelForExecution(
  executionClass: AiExecutionClass
): ResolvedModelPolicy {
  const emergency = process.env.AFENDA_AI_EMERGENCY_FALLBACK === "1"

  switch (executionClass) {
    case "public_chat":
    case "docs_search_answer":
    case "admin_testing":
      return { primary: DEFAULT_CHAT_MODEL, fallbacks: DEFAULT_LYNX_FALLBACKS }

    case "truth_generation":
      return {
        primary: DEFAULT_CHAT_MODEL,
        fallbacks: emergency ? DEFAULT_LYNX_FALLBACKS : [],
      }

    case "embeddings":
      return { primary: DEFAULT_EMBEDDING_MODEL, fallbacks: [] }
  }
}

function isGatewayRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  if (message.includes("rate limit") || message.includes("429")) return true
  if (
    message.includes("503") ||
    message.includes("502") ||
    message.includes("504")
  )
    return true
  return false
}

/**
 * Resolve primary + fallback language models for streaming / generation.
 * Walks the fallback list on retryable Gateway failures.
 */
export function resolveLanguageModelWithFallback(
  executionClass: AiExecutionClass
) {
  const policy = resolveLanguageModelForExecution(executionClass)
  const modelIds = [policy.primary, ...policy.fallbacks]

  return {
    policy,
    modelIds,
    resolvePrimary() {
      return resolveLanguageModel(policy.primary)
    },
    runWithFallback<T>(
      run: (model: ReturnType<typeof resolveLanguageModel>) => T
    ): T {
      let lastError: unknown
      for (const modelId of modelIds) {
        try {
          return run(resolveLanguageModel(modelId))
        } catch (error) {
          lastError = error
          if (!isGatewayRetryableError(error)) {
            throw error
          }
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error("All configured AI Gateway models failed.")
    },
  }
}
