import { z } from "zod"

import {
  type ChatUIMessage,
  normalizePublicLynxChatMessages,
  PUBLIC_LYNX_MAX_MESSAGES,
  PUBLIC_LYNX_MAX_PAYLOAD_CHARS,
  PUBLIC_LYNX_MAX_RAW_BODY_CHARS,
  PUBLIC_LYNX_MAX_USER_INPUT_CHARS,
} from "./public-lynx.shared"

const uiMessageSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(["user", "assistant", "system"]),
    parts: z.array(z.unknown()).optional(),
  })
  .passthrough()

export const publicLynxChatRequestSchema = z.object({
  messages: z
    .array(uiMessageSchema)
    .max(
      PUBLIC_LYNX_MAX_MESSAGES,
      `Maximum ${PUBLIC_LYNX_MAX_MESSAGES} messages allowed`
    )
    .default([]),
})

export type PublicLynxChatRequestParseResult =
  | { success: true; messages: ChatUIMessage[] }
  | { success: false; error: string; status: 400 }

export type PublicLynxChatRequestBodyReadResult =
  | { success: true; body: unknown }
  | { success: false; error: string; status: 400 | 413 }

/** Parses a raw POST body string after size checks (shared with route + tests). */
export function parsePublicLynxChatRequestBodyText(
  raw: string
): PublicLynxChatRequestBodyReadResult {
  if (raw.length > PUBLIC_LYNX_MAX_RAW_BODY_CHARS) {
    return {
      success: false,
      error: "Request body too large.",
      status: 413,
    }
  }

  try {
    return { success: true, body: JSON.parse(raw) as unknown }
  } catch {
    return { success: false, error: "Invalid JSON body.", status: 400 }
  }
}

/**
 * Reads and JSON-parses a Public Lynx POST body with raw-byte caps.
 * `contentLength` is optional (from `Content-Length` header).
 */
export function readPublicLynxChatRequestBody(
  raw: string,
  contentLength?: string | null
): PublicLynxChatRequestBodyReadResult {
  if (contentLength) {
    const len = Number.parseInt(contentLength, 10)
    if (
      Number.isFinite(len) &&
      len >= 0 &&
      len > PUBLIC_LYNX_MAX_RAW_BODY_CHARS
    ) {
      return {
        success: false,
        error: "Request body too large.",
        status: 413,
      }
    }
  }

  return parsePublicLynxChatRequestBodyText(raw)
}

function userMessageText(message: ChatUIMessage): string {
  return (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("")
}

function validateUserMessages(messages: ChatUIMessage[]): string | null {
  if (messages.length === 0) {
    return "At least one message is required."
  }

  const userMessages = messages.filter((message) => message.role === "user")
  if (userMessages.length === 0) {
    return "At least one user message is required."
  }

  if (
    !userMessages.some((message) => userMessageText(message).trim().length > 0)
  ) {
    return "At least one user message must include text."
  }

  for (const message of userMessages) {
    for (const part of message.parts ?? []) {
      if (
        part.type === "text" &&
        part.text.length > PUBLIC_LYNX_MAX_USER_INPUT_CHARS
      ) {
        return `Each message must be at most ${PUBLIC_LYNX_MAX_USER_INPUT_CHARS} characters.`
      }
    }
  }

  return null
}

export function parsePublicLynxChatRequest(
  body: unknown
): PublicLynxChatRequestParseResult {
  const parsed = publicLynxChatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid request.",
      status: 400,
    }
  }

  const messages = normalizePublicLynxChatMessages(
    parsed.data.messages as ChatUIMessage[]
  )

  const userMessageError = validateUserMessages(messages)
  if (userMessageError) {
    return { success: false, error: userMessageError, status: 400 }
  }

  if (JSON.stringify(messages).length > PUBLIC_LYNX_MAX_PAYLOAD_CHARS) {
    return {
      success: false,
      error: "Request payload too large.",
      status: 400,
    }
  }

  return { success: true, messages }
}
