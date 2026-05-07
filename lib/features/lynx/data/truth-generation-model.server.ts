import "server-only"

import { createGateway } from "@ai-sdk/gateway"
import { openai } from "@ai-sdk/openai"

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"

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
    const id = configured?.includes("/")
      ? configured
      : `openai/${configured ?? DEFAULT_OPENAI_MODEL}`
    return gateway(id)
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return null
  }

  const id = configured?.includes("/")
    ? configured.replace(/^openai\//, "")
    : (configured ?? DEFAULT_OPENAI_MODEL)
  return openai(id)
}
