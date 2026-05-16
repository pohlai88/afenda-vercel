import type { UIMessage } from "ai"

/** Route Handler path for Public Lynx (Ask Lynx on ask-docs). */
export const PUBLIC_LYNX_CHAT_API_PATH = "/api/chat" as const

/** Default gateway model for Public Lynx — keep in sync with `#lib/ai/gateway.server` fallback. */
export const PUBLIC_LYNX_PRIMARY_MODEL_ID = "openai/gpt-4o-mini" as const

/** UI label derived from a gateway `provider/model` id. */
export function formatPublicLynxModelLabel(
  modelId: string = PUBLIC_LYNX_PRIMARY_MODEL_ID
): string {
  const trimmed = modelId.trim()
  const slash = trimmed.indexOf("/")
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed
}

/** Optional client mirror of `LYNX_PRIMARY_MODEL` for the Ask Lynx header label. */
export function resolvePublicLynxDisplayModelId(): string {
  const fromEnv =
    typeof process.env.NEXT_PUBLIC_LYNX_PRIMARY_MODEL === "string"
      ? process.env.NEXT_PUBLIC_LYNX_PRIMARY_MODEL.trim()
      : ""
  return fromEnv || PUBLIC_LYNX_PRIMARY_MODEL_ID
}

/** Max agentic tool rounds per Public Lynx turn (`streamText` + `stepCountIs`). */
export const PUBLIC_LYNX_MAX_TOOL_STEPS = 5

export type PublicLynxChatStatus = "submitted" | "streaming" | "ready" | "error"

export function isPublicLynxChatLoading(status: PublicLynxChatStatus): boolean {
  return status === "streaming" || status === "submitted"
}

export const PUBLIC_LYNX_MAX_MESSAGES = 20

/** Drops client system prompts and keeps the newest window for POST /api/chat. */
export function normalizePublicLynxChatMessages(
  messages: ChatUIMessage[]
): ChatUIMessage[] {
  return messages
    .filter((message) => message.role !== "system")
    .slice(-PUBLIC_LYNX_MAX_MESSAGES)
}
export const PUBLIC_LYNX_MAX_USER_INPUT_CHARS = 4_000
/** Upper bound for serialized messages array in POST body. */
export const PUBLIC_LYNX_MAX_PAYLOAD_CHARS = PUBLIC_LYNX_MAX_MESSAGES * 8_000

/** Raw POST body cap before JSON parse (JSON overhead + parts metadata). */
export const PUBLIC_LYNX_MAX_RAW_BODY_CHARS =
  PUBLIC_LYNX_MAX_PAYLOAD_CHARS + 16_384

export type ChatUIMessage = UIMessage<never, { client: { location: string } }>

export const PUBLIC_LYNX_METHOD_NOT_ALLOWED_ERROR =
  "Method not allowed." as const

/** Non-POST callers (crawlers, probes) get a stable 405 without loading the stream handler. */
export function createPublicLynxMethodNotAllowedResponse(): Response {
  return Response.json(
    { error: PUBLIC_LYNX_METHOD_NOT_ALLOWED_ERROR },
    { status: 405 }
  )
}
