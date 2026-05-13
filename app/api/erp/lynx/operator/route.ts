import { createHash } from "node:crypto"

import {
  createLynxOperatorRuntime,
  LYNX_AUDIT_ACTIONS,
  LYNX_OPERATOR_DEFAULT_MAX_OUTPUT_TOKENS,
  LYNX_OPERATOR_MAX_STEPS,
  lynxOperatorBodySchema,
  type LynxOperatorAuditToolCall,
  type LynxOperatorNdjsonMeta,
  type LynxOperatorNdjsonTool,
  type LynxTruthNdjsonDelta,
  type LynxTruthNdjsonError,
} from "#features/lynx"
import * as Sentry from "@sentry/nextjs"

import { isLynxOperatorEnabled } from "#flags"
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

function lynxOperatorMaxOutputTokens(): number {
  const raw = process.env.LYNX_OPERATOR_MAX_OUTPUT_TOKENS?.trim()
  if (!raw) return LYNX_OPERATOR_DEFAULT_MAX_OUTPUT_TOKENS
  const n = Number(raw)
  return Number.isFinite(n) && n > 0
    ? Math.floor(n)
    : LYNX_OPERATOR_DEFAULT_MAX_OUTPUT_TOKENS
}

function resolveToolErrorCode(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "EMBED_UNAVAILABLE") return "EMBED_UNAVAILABLE"
    if (err.message === "EMBED_FAILED") return "EMBED_FAILED"
  }
  return "TOOL_ERROR"
}

export async function POST(request: Request) {
  const org = await getOrgSessionFromRequest(request)
  if (!org) {
    return routeJsonError("Unauthorized", 401)
  }

  if (!(await isLynxOperatorEnabled())) {
    return routeJsonError(
      "Lynx operator assist is disabled by feature policy.",
      403
    )
  }

  const parsedBody = await readRequestJson(request)
  if (!parsedBody.ok) return parsedBody.response

  const parsed = lynxOperatorBodySchema.safeParse(parsedBody.value)
  if (!parsed.success) {
    return routeJsonError("Invalid message", 400)
  }

  const lynxRuntime = createLynxOperatorRuntime({
    organizationId: org.organizationId,
    executionMode: "interactive",
  })
  if (!lynxRuntime) {
    return routeJsonError(
      "Could not resolve a language model (configure AI_GATEWAY_API_KEY or OPENAI_API_KEY)",
      503
    )
  }

  const { message } = parsed.data

  const encoder = new TextEncoder()
  const metaLine: LynxOperatorNdjsonMeta = {
    type: "meta",
    layer: "operator",
    tools: [...lynxRuntime.toolIds],
  }

  const path = new URL(request.url).pathname
  const messageDigest = createHash("sha256")
    .update(message, "utf8")
    .digest("hex")

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`${JSON.stringify(metaLine)}\n`))
      const pendingTools = new Map<
        string,
        { toolId: string; startedAt: string }
      >()
      const toolCalls: LynxOperatorAuditToolCall[] = []

      try {
        const streamResult = await lynxRuntime.stream({
          prompt: message,
          maxOutputTokens: lynxOperatorMaxOutputTokens(),
        })

        for await (const part of streamResult.fullStream) {
          if (part.type === "text-delta") {
            const line: LynxTruthNdjsonDelta = {
              type: "delta",
              delta: part.text,
            }
            controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
            continue
          }

          if (part.type === "tool-call") {
            const startedAt = new Date().toISOString()
            pendingTools.set(part.toolCallId, {
              toolId: part.toolName,
              startedAt,
            })
            const nd: LynxOperatorNdjsonTool = {
              type: "tool",
              id: part.toolName,
              status: "called",
            }
            controller.enqueue(encoder.encode(`${JSON.stringify(nd)}\n`))
            continue
          }

          if (part.type === "tool-result") {
            const completedAt = new Date().toISOString()
            const pending = pendingTools.get(part.toolCallId)
            pendingTools.delete(part.toolCallId)
            const startedAt = pending?.startedAt ?? completedAt
            const durationMs = Math.max(
              0,
              Date.parse(completedAt) - Date.parse(startedAt)
            )
            toolCalls.push({
              toolId: part.toolName,
              startedAt,
              completedAt,
              durationMs,
              success: true,
            })
            const nd: LynxOperatorNdjsonTool = {
              type: "tool",
              id: part.toolName,
              status: "completed",
              durationMs,
            }
            controller.enqueue(encoder.encode(`${JSON.stringify(nd)}\n`))
            continue
          }

          if (part.type === "tool-error") {
            const completedAt = new Date().toISOString()
            const pending = pendingTools.get(part.toolCallId)
            pendingTools.delete(part.toolCallId)
            const startedAt = pending?.startedAt ?? completedAt
            const durationMs = Math.max(
              0,
              Date.parse(completedAt) - Date.parse(startedAt)
            )
            const errorCode = resolveToolErrorCode(part.error)
            toolCalls.push({
              toolId: part.toolName,
              startedAt,
              completedAt,
              durationMs,
              success: false,
              errorCode,
            })
            const nd: LynxOperatorNdjsonTool = {
              type: "tool",
              id: part.toolName,
              status: "completed",
              durationMs,
            }
            controller.enqueue(encoder.encode(`${JSON.stringify(nd)}\n`))
            continue
          }

          if (part.type === "error") {
            const msg =
              part.error instanceof Error ? part.error.message : "Stream error"
            const line: LynxTruthNdjsonError = { type: "error", message: msg }
            controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`))
            controller.close()
            return
          }
        }

        const finishReason = await streamResult.finishReason
        void writeIamAuditEventFromHeaders(request.headers, {
          action: LYNX_AUDIT_ACTIONS.operatorRecommend,
          organizationId: org.organizationId,
          actorUserId: org.userId,
          actorSessionId: org.sessionId,
          resourceType: "lynx.operator",
          resourceId: messageDigest,
          path,
          metadata: {
            messageLen: message.length,
            finishReason,
            maxSteps: LYNX_OPERATOR_MAX_STEPS,
            executionMode: lynxRuntime.executionMode,
            toolCalls,
          },
        })
      } catch (err) {
        logUnexpectedServerError("lynx_operator_stream_failed", err, {
          scope: "api.erp.lynx.operator",
          "erp.module": "lynx",
          organizationId: org.organizationId,
        })
        Sentry.captureException(
          err instanceof Error ? err : new Error(String(err)),
          {
            tags: {
              scope: "api.erp.lynx.operator",
              "erp.module": "lynx",
            },
            extra: { organizationId: org.organizationId },
          }
        )
        const msg =
          err instanceof Error ? err.message : "Operator generation failed"
        const line: LynxTruthNdjsonError = { type: "error", message: msg }
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
