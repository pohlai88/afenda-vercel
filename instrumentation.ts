import type { Instrumentation } from "next"

import type { NextRequestErrorReportContext } from "#lib/request-error-context.shared"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerNodeInstrumentation } =
      await import("./instrumentation.node")
    await registerNodeInstrumentation()
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

/**
 * Server observability hook — await async reporting so telemetry completes before the worker exits
 * (Next.js requirement for `onRequestError`).
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation — await async tasks in `onRequestError`
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  const err = error as Error & { digest?: string }
  const reportCtx: NextRequestErrorReportContext = {
    digest: err.digest,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
    routerKind: context.routerKind,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { emitNodeRequestErrorTelemetry } =
      await import("#lib/request-error-telemetry.server")
    await emitNodeRequestErrorTelemetry(err, reportCtx)
  } else {
    const line = JSON.stringify({
      level: "error",
      msg: "request_error",
      service: process.env.OTEL_SERVICE_NAME ?? "afenda-vercel",
      err: {
        type: err.name,
        message: err.message,
        stack: err.stack,
      },
      ...reportCtx,
    })
    // Edge runtime — Pino (Node-only) is unavailable; raw JSON stderr is the correct channel.
    // eslint-disable-next-line no-console
    console.error(line)

    const Sentry = await import("@sentry/nextjs")
    Sentry.captureException(err, {
      tags: {
        digest: reportCtx.digest ?? "",
        routeType: reportCtx.routeType,
        routePath: reportCtx.routePath,
        routerKind: reportCtx.routerKind,
      },
      contexts: {
        next_request: reportCtx as unknown as Record<string, unknown>,
      },
    })
  }
}
