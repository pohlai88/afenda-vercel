import "server-only"

import { createGateway } from "@ai-sdk/gateway"
import { openai } from "@ai-sdk/openai"

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

function parseGatewayModelFallbacks(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(",")) {
    const id = part.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

function primaryGatewayModelId(configured: string | undefined): string {
  if (configured?.includes("/")) return configured
  return `openai/${configured ?? DEFAULT_OPENAI_MODEL}`
}

function primaryOpenAiModelId(configured: string | undefined): string {
  if (configured?.includes("/")) return configured.replace(/^openai\//, "")
  return configured ?? DEFAULT_OPENAI_MODEL
}

/**
 * Language model for Lynx truth streaming.
 * Prefer **Vercel AI Gateway** when `AI_GATEWAY_API_KEY` is set; otherwise
 * **OpenAI** via `OPENAI_API_KEY` and `@ai-sdk/openai`.
 *
 * `LYNX_GENERATION_MODEL`: OpenAI id (e.g. `gpt-4o-mini`) or full gateway id
 * (e.g. `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4.6`).
 */
export function resolveLynxTruthStreamModel() {
  const configured = process.env.LYNX_GENERATION_MODEL?.trim()

  if (process.env.AI_GATEWAY_API_KEY?.trim()) {
    const gateway = createGateway({
      apiKey: process.env.AI_GATEWAY_API_KEY,
    })
    return gateway(primaryGatewayModelId(configured))
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return null
  }

  return openai(primaryOpenAiModelId(configured))
}

/**
 * AI Gateway routing options for `streamText` (fallback models, etc.).
 * No-op when not using the gateway — see
 * https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks
 */
export function resolveLynxTruthStreamProviderOptions():
  | { gateway: { models: string[] } }
  | undefined {
  if (!process.env.AI_GATEWAY_API_KEY?.trim()) return undefined

  const configured = process.env.LYNX_GENERATION_MODEL?.trim()
  const primary = primaryGatewayModelId(configured)
  const fallbacks = parseGatewayModelFallbacks(
    process.env.LYNX_GATEWAY_MODEL_FALLBACKS
  ).filter((id) => id !== primary)

  if (fallbacks.length === 0) return undefined

  return { gateway: { models: fallbacks } }
}
