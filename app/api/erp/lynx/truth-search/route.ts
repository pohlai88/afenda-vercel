import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"

import {
  embedKnowledgeText,
  findSimilarKnowledgeChunks,
} from "#features/knowledge"
import {
  buildLynxTruthSystemPrompt,
  LYNX_TRUTH_TOP_K,
  lynxTruthSearchBodySchema,
  type LynxTruthEvidenceDTO,
  type LynxTruthNdjsonDelta,
  type LynxTruthNdjsonMeta,
} from "#features/lynx"
import { getOrgSessionFromRequest } from "#lib/tenant"

export const runtime = "nodejs"
export const maxDuration = 60

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
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const parsed = lynxTruthSearchBodySchema.safeParse(json)
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Invalid question" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY is not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    )
  }

  const { question } = parsed.data

  let queryEmbedding: number[]
  try {
    queryEmbedding = await embedKnowledgeText(question)
  } catch {
    return new Response(JSON.stringify({ error: "Could not embed question" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    })
  }

  const passages = await findSimilarKnowledgeChunks(
    org.organizationId,
    queryEmbedding,
    LYNX_TRUTH_TOP_K
  )

  const evidence = toEvidenceDto(passages)
  const system = buildLynxTruthSystemPrompt(passages)

  const modelId = process.env.LYNX_GENERATION_MODEL?.trim() || "gpt-4o-mini"

  const result = streamText({
    model: openai(modelId),
    system,
    prompt: question,
  })

  const encoder = new TextEncoder()
  const metaLine: LynxTruthNdjsonMeta = {
    type: "evidence",
    evidence,
    limitationsPreamble: LIMITATIONS_PREAMBLE,
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${JSON.stringify(metaLine)}\n`))
      try {
        for await (const delta of result.textStream) {
          const line: LynxTruthNdjsonDelta = { type: "delta", delta }
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
        }
      } catch (err) {
        console.error("[lynx truth-search]", err)
        controller.error(err)
        return
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  })
}
