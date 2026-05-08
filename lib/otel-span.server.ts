import "server-only"

import { trace } from "@opentelemetry/api"

const TRACER_NAME = "afenda-vercel"

/**
 * Active span around async work (Node runtime only). Edge / unknown runtime runs `fn` directly.
 * Custom spans are not supported on Edge per Vercel OTEL docs — skip when not nodejs.
 */
export async function runWithNodeOtelSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean | undefined>,
  fn: () => Promise<T>
): Promise<T> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return fn()
  }

  const tracer = trace.getTracer(TRACER_NAME)
  return tracer.startActiveSpan(name, async (span) => {
    try {
      for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined) {
          span.setAttribute(key, value)
        }
      }
      return await fn()
    } catch (error) {
      span.recordException(error as Error)
      throw error
    } finally {
      span.end()
    }
  })
}
