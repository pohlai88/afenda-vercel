import { createHash } from "node:crypto"

import { streamText } from "ai"

import {
  embedKnowledgeText,
  findSimilarKnowledgeChunks,
} from "#features/knowledge"
import {
  buildLynxTruthSystemPrompt,
  LYNX_AUDIT_ACTIONS,
  LYNX_TRUTH_DEFAULT_MAX_OUTPUT_TOKENS,
  LYNX_TRUTH_TOP_K,
  lynxTruthSearchBodySchema,
  resolveLynxTruthStreamModel,
  resolveLynxTruthStreamProviderOptions,
  type LynxTruthEvidenceDTO,
  type LynxTruthNdjsonDelta,
  type LynxTruthNdjsonError,
  type LynxTruthNdjsonMeta,
} from "#features/lynx"
import * as Sentry from "@sentry/nextjs"

import { writeIamAuditEventFromHeaders } from "#lib/auth"
import { logUnexpectedServerError } from "#lib/logger.server"
import {
  readRequestJson,
  ROUTE_JSON_HEADERS,
  routeJsonError,
} from "#lib/route-handler-json.shared"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

function lynxMaxOutputTokens(): number {
  const raw = process.env.LYNX_MAX_OUTPUT_TOKENS?.trim()
  if (!raw) return LYNX_TRUTH_DEFAULT_MAX_OUTPUT_TOKENS
  const n = Number(raw)
  return Number.isFinite(n) && n > 0
    ? Math.floor(n)
    : LYNX_TRUTH_DEFAULT_MAX_OUTPUT_TOKENS
}

const LIMITATIONS_PREAMBLE =
  "Lynx only uses the evidence passages retrieved for your organization. Add knowledge chunks for broader coverage."

function toEvidenceDto(
  rows: Awaited<ReturnType<typeof findSimilarKnowledgeChunks>>
): LynxTruthEvidenceDTO[] {
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body.length > 1200 ? `${r.body.slice(0, 1200)}…` : r.body,
    distance: r.distance,
  }))
}

export async function POST(request: Request) {
  const org = await getOrgSessionFromRequest(request)
  if (!org) {
    return routeJsonError("Unauthorized", 401)
  }

  const parsedBody = await readRequestJson(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = lynxTruthSearchBodySchema.safeParse(parsedBody.value)
  if (!parsed.success) {
    return routeJsonError("Invalid question", 400)
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return routeJsonError(
      "OPENAI_API_KEY is required for knowledge embeddings (Lynx retrieval). Optional: AI_GATEWAY_API_KEY routes answer generation via Vercel AI Gateway.",
      503
    )
  }

  const languageModel = resolveLynxTruthStreamModel()
  if (!languageModel) {
    return routeJsonError(
      "Could not resolve a language model for Lynx generation (configure AI_GATEWAY_API_KEY or OPENAI_API_KEY)",
      503
    )
  }

  const { question } = parsed.data

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedKnowledgeText(question)
  } catch {
    return routeJsonError("Could not embed question", 503)
  }

  const passages = await findSimilarKnowledgeChunks(
    org.organizationId,
    queryEmbedding,
    LYNX_TRUTH_TOP_K
  )

  const evidence = toEvidenceDto(passages)
  const system = buildLynxTruthSystemPrompt(passages)
  const gatewayOpts = resolveLynxTruthStreamProviderOptions()

  const result = streamText({
    model: languageModel,
    system,
    prompt: question,
    maxOutputTokens: lynxMaxOutputTokens(),
    ...(gatewayOpts ? { providerOptions: gatewayOpts } : {}),
  })

  const encoder = new TextEncoder()
  const metaLine: LynxTruthNdjsonMeta = {
    type: "evidence",
    evidence,
    limitationsPreamble: LIMITATIONS_PREAMBLE,
  }

  const path = new URL(request.url).pathname
  const questionDigest = createHash("sha256")
    .update(question, "utf8")
    .digest("hex")

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${JSON.stringify(metaLine)}\n`))
      try {
        for await (const delta of result.textStream) {
          const line: LynxTruthNdjsonDelta = { type: "delta", delta }
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
        }
        void writeIamAuditEventFromHeaders(request.headers, {
          action: LYNX_AUDIT_ACTIONS.truthQuery,
          organizationId: org.organizationId,
          actorUserId: org.userId,
          actorSessionId: org.sessionId,
          resourceType: "lynx.truth",
          resourceId: questionDigest,
          path,
          metadata: {
            evidenceCount: evidence.length,
            topK: LYNX_TRUTH_TOP_K,
            questionLen: question.length,
          },
        })
      } catch (err) {
        logUnexpectedServerError("lynx_truth_search_stream_failed", err, {
          scope: "api.erp.lynx.truth_search",
          "erp.module": "lynx",
          organizationId: org.organizationId,
        })
        Sentry.captureException(
          err instanceof Error ? err : new Error(String(err)),
          {
            tags: {
              scope: "api.erp.lynx.truth_search",
              "erp.module": "lynx",
            },
            extra: { organizationId: org.organizationId },
          }
        )
        const message =
          err instanceof Error ? err.message : "Truth generation failed"
        const line: LynxTruthNdjsonError = { type: "error", message }
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
        controller.close()
        return
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      ...ROUTE_JSON_HEADERS,
    },
  })
}
