import "server-only"

import * as Sentry from "@sentry/nextjs"

import { createRequestLogger } from "./logger.server"
import type { NextRequestErrorReportContext } from "./request-error-context.shared"

export async function emitNodeRequestErrorTelemetry(
  err: Error & { digest?: string },
  ctx: NextRequestErrorReportContext
): Promise<void> {
  const reqLog = createRequestLogger({
    path: ctx.path,
    method: ctx.method,
    routePath: ctx.routePath,
    routeType: ctx.routeType,
    routerKind: ctx.routerKind,
  })
  reqLog.error({ err, ...ctx }, "request_error")

  Sentry.captureException(err, {
    tags: {
      digest: ctx.digest ?? "",
      routeType: ctx.routeType,
      routePath: ctx.routePath,
      routerKind: ctx.routerKind,
    },
    contexts: {
      next_request: ctx as unknown as Record<string, unknown>,
    },
  })
}
