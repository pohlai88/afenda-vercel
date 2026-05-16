import { convertToModelMessages, stepCountIs, streamText, tool } from "ai"
import { connection } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"

import { hasAiGatewayAuth } from "#lib/ai/gateway.server"
import { resolveLanguageModelWithFallback } from "#lib/ai/model-policy.server"
import { resolveAskDocsLocaleFromMessages } from "#lib/ask-docs/public-lynx-client-context.shared"
import {
  parsePublicLynxChatRequest,
  readPublicLynxChatRequestBody,
} from "#lib/ask-docs/public-lynx-request.shared"
import {
  createPublicLynxMethodNotAllowedResponse,
  PUBLIC_LYNX_MAX_TOOL_STEPS,
  type ChatUIMessage,
} from "#lib/ask-docs/public-lynx.shared"
import { checkPublicLynxRateLimit } from "#lib/ask-docs/public-lynx-rate.server"
import { publicLynxSearchHits } from "#lib/ask-docs/public-lynx-search.shared"
import { searchAskDocs } from "#lib/ask-docs/public-lynx-search.server"
import type { AppLocale } from "#lib/i18n/locales.shared"
import { logUnexpectedServerError } from "#lib/logger.server"

export type { ChatUIMessage } from "#lib/ask-docs/public-lynx.shared"

export const maxDuration = 30

const SYSTEM_PROMPT = [
  "You are Lynx, Afenda's public documentation assistant.",
  "Use the `search` tool to retrieve relevant ask-docs context before answering when needed.",
  "Ground answers in search results and cite sources as markdown links using each document `url` when available.",
  "If you cannot find the answer in search results, say you do not know and suggest a better search query.",
  "Do not invent ERP tenant data, permissions, or org-specific configuration.",
].join("\n")

function createSearchTool(locale: AppLocale) {
  return tool({
    description: "Search the ask-docs content and return matching documents.",
    inputSchema: z.object({
      query: z.string().min(1).max(500),
      limit: z.number().int().min(1).max(20).default(10),
    }),
    async execute({ query, limit }) {
      const results = await searchAskDocs(query, limit, locale)
      return publicLynxSearchHits(results)
    },
  })
}

export function GET(): Response {
  return createPublicLynxMethodNotAllowedResponse()
}

export async function POST(req: NextRequest): Promise<Response> {
  await connection()

  if (!hasAiGatewayAuth()) {
    return Response.json(
      { error: "Ask Lynx is not configured (AI Gateway credentials missing)." },
      { status: 503 }
    )
  }

  const rateLimited = await checkPublicLynxRateLimit(req)
  if (rateLimited) return rateLimited

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 })
  }

  const bodyRead = readPublicLynxChatRequestBody(
    raw,
    req.headers.get("content-length")
  )
  if (!bodyRead.success) {
    return Response.json({ error: bodyRead.error }, { status: bodyRead.status })
  }

  const parsed = parsePublicLynxChatRequest(bodyRead.body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error }, { status: parsed.status })
  }

  const { messages } = parsed
  const askDocsLocale = resolveAskDocsLocaleFromMessages(messages)

  const modelRouting = resolveLanguageModelWithFallback("public_chat")

  try {
    const modelMessages = await convertToModelMessages<ChatUIMessage>(
      messages,
      {
        convertDataPart(part) {
          if (part.type === "data-client") {
            return {
              type: "text",
              text: `[Client Context: ${JSON.stringify(part.data)}]`,
            }
          }
        },
      }
    )

    const result = modelRouting.runWithFallback((model) =>
      streamText({
        model,
        stopWhen: stepCountIs(PUBLIC_LYNX_MAX_TOOL_STEPS),
        abortSignal: req.signal,
        tools: { search: createSearchTool(askDocsLocale) },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...modelMessages,
        ],
        toolChoice: "auto",
        onError({ error }) {
          logUnexpectedServerError("public_lynx_stream_error", error)
        },
      })
    )

    return result.toUIMessageStreamResponse()
  } catch (err) {
    logUnexpectedServerError("public_lynx_stream_start_failed", err)
    return Response.json(
      { error: "Ask Lynx could not start a response." },
      { status: 500 }
    )
  }
}
