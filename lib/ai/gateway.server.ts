import "server-only"

import { createGateway } from "@ai-sdk/gateway"

import { PUBLIC_LYNX_PRIMARY_MODEL_ID } from "#lib/ask-docs/public-lynx.shared"

function parseCommaSeparatedModels(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** Primary chat model for Public Lynx (`app/api/chat`). */
export const DEFAULT_CHAT_MODEL =
  process.env.LYNX_PRIMARY_MODEL?.trim() || PUBLIC_LYNX_PRIMARY_MODEL_ID

/** Default embedding model for knowledge chunks (1536 dims). */
export const DEFAULT_EMBEDDING_MODEL =
  process.env.LYNX_EMBEDDING_MODEL?.trim() || "openai/text-embedding-3-small"

const configuredLynxFallbacks = parseCommaSeparatedModels(
  process.env.LYNX_FALLBACK_MODELS ?? process.env.LYNX_GATEWAY_MODEL_FALLBACKS
)

/** Gateway fallback model ids when `LYNX_FALLBACK_MODELS` is unset. */
export const DEFAULT_LYNX_FALLBACKS = (
  configuredLynxFallbacks.length > 0
    ? configuredLynxFallbacks
    : ["anthropic/claude-sonnet-4.6", "google/gemini-2.5-flash"]
) as readonly string[]

export const GATEWAY_AUTH_MISSING =
  "AI Gateway credentials missing (set AI_GATEWAY_API_KEY locally or deploy on Vercel for VERCEL_OIDC_TOKEN)"

/** Ensures `provider/model` form required by AI Gateway. */
export function normalizeGatewayModelId(
  modelId: string,
  defaultProvider = "openai"
): string {
  const trimmed = modelId.trim()
  if (!trimmed) return trimmed
  return trimmed.includes("/") ? trimmed : `${defaultProvider}/${trimmed}`
}

/**
 * True when Vercel AI Gateway can authenticate: explicit API key locally or
 * OIDC token on Vercel deployments.
 */
export function hasAiGatewayAuth(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
    process.env.VERCEL_OIDC_TOKEN?.trim()
  )
}

/**
 * Shared gateway provider. SDK reads `AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN`
 * from the environment when no explicit apiKey is passed.
 */
export function resolveAiGateway() {
  if (!hasAiGatewayAuth()) {
    throw new Error(GATEWAY_AUTH_MISSING)
  }
  return createGateway({})
}

/** Language model via gateway (`provider/model` id). */
export function resolveLanguageModel(modelId: string) {
  return resolveAiGateway()(normalizeGatewayModelId(modelId))
}

/** Embedding model via gateway (`provider/model` id). */
export function resolveEmbeddingModel(modelId: string) {
  return resolveAiGateway().textEmbeddingModel(normalizeGatewayModelId(modelId))
}

/** Reranking model via gateway (`provider/model` id). */
export function resolveRerankingModel(modelId: string) {
  return resolveAiGateway().rerankingModel(normalizeGatewayModelId(modelId))
}
