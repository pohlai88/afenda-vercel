import "server-only"

import {
  DEFAULT_LYNX_FALLBACKS,
  hasAiGatewayAuth,
  normalizeGatewayModelId,
  resolveLanguageModel,
} from "#lib/ai/gateway.server"

const DEFAULT_LYNX_CHAT_MODEL = "openai/gpt-4o-mini"

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
  return normalizeGatewayModelId(
    configured ?? DEFAULT_LYNX_CHAT_MODEL.replace(/^openai\//, "")
  )
}

/**
 * Language model for Lynx truth streaming via **Vercel AI Gateway**.
 *
 * `LYNX_GENERATION_MODEL`: OpenAI id (e.g. `gpt-4o-mini`) or full gateway id
 * (e.g. `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4.6`).
 */
export function resolveLynxTruthStreamModel() {
  if (!hasAiGatewayAuth()) {
    return null
  }

  const configured = process.env.LYNX_GENERATION_MODEL?.trim()
  return resolveLanguageModel(primaryGatewayModelId(configured))
}

/**
 * AI Gateway routing options for `streamText` (fallback models, etc.).
 * See https://vercel.com/docs/ai-gateway/models-and-providers/model-fallbacks
 */
export function resolveLynxTruthStreamProviderOptions():
  | { gateway: { models: string[] } }
  | undefined {
  if (!hasAiGatewayAuth()) return undefined

  const configured = process.env.LYNX_GENERATION_MODEL?.trim()
  const primary = primaryGatewayModelId(configured)
  const envFallbacks = parseGatewayModelFallbacks(
    process.env.LYNX_GATEWAY_MODEL_FALLBACKS
  )
  const fallbacks = (
    envFallbacks.length > 0 ? envFallbacks : [...DEFAULT_LYNX_FALLBACKS]
  ).filter((id) => id !== primary)

  if (fallbacks.length === 0) return undefined

  return { gateway: { models: fallbacks } }
}

/** Org-scoped hook for BYOK / routing overrides; today delegates to global gateway options. */
export async function resolveLynxTruthStreamProviderOptionsForOrg(
  organizationId: string
): Promise<{ gateway: { models: string[] } } | undefined> {
  void organizationId
  return resolveLynxTruthStreamProviderOptions()
}
