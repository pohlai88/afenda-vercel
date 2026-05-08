import "server-only"

import pino from "pino"

/**
 * Pino expects Node streams / worker transports. Edge bundles must not import this module.
 *
 * **Next.js (Node runtime)** — load via root `instrumentation.ts` → `instrumentation.node.ts` only when
 * `NEXT_RUNTIME === "nodejs"`; keep `serverExternalPackages` including `pino` so the bundler does not inline native/thread deps.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation — runtime-specific registration
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages — `pino` default external list
 */
if (process.env.NEXT_RUNTIME === "edge") {
  throw new Error(
    "#lib/logger.server is Node-only (Pino). Use structured JSON on stderr for Edge, or keep logging in Instrumentation.onRequestError behind NEXT_RUNTIME checks."
  )
}

const isProd = process.env.NODE_ENV === "production"

/** Opt-in: `pino-pretty` uses a worker thread and can be flaky under Turbopack; default is JSON everywhere. */
const usePrettyTransport = !isProd && process.env.LOG_PRETTY === "1"

function baseBindings(): Record<string, string | undefined> {
  return {
    service: process.env.OTEL_SERVICE_NAME ?? "afenda-vercel",
    vercelEnv: process.env.VERCEL_ENV,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA,
  }
}

const redactPaths = [
  "password",
  "*.password",
  "authorization",
  "headers.authorization",
  "headers.cookie",
  "cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "token",
  "*.token",
  "accessToken",
  "refreshToken",
  "apiKey",
  "*.apiKey",
  "secret",
  "*.secret",
]

/**
 * Canonical server JSON logger (Vercel Runtime Logs–friendly).
 * Use `child` / `createRequestLogger` for request-scoped fields; never log raw PII.
 *
 * Next.js bundles server dependencies unless listed in `serverExternalPackages`; `pino` defaults there.
 * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
 */
export const rootLogger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  serializers: {
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: redactPaths,
    censor: "[Redacted]",
  },
  base: baseBindings(),
  ...(usePrettyTransport
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
          },
        },
      }
    : {}),
})

export function createRequestLogger(
  bindings: Record<string, string | number | boolean | undefined>
) {
  const cleaned = Object.fromEntries(
    Object.entries(bindings).filter(([, v]) => v !== undefined)
  ) as Record<string, string | number | boolean>
  return rootLogger.child(cleaned)
}

/**
 * Log an **unexpected** caught failure (Route Handler / Server Action catch blocks).
 * Prefer returning structured errors for **expected** failures (Next.js Server Functions guidance); use `warn`/`debug` for routine outcomes — not `error`.
 *
 * Shape: merge object + `err` so `pino.stdSerializers.err` emits type/message/stack.
 * @see https://github.com/pinojs/pino/blob/main/docs/api.md — Errors / mergingObject
 */
export function logUnexpectedServerError(
  message: string,
  err: unknown,
  fields?: Record<string, string | number | boolean | undefined>
): void {
  const normalized = err instanceof Error ? err : new Error(String(err))
  const merged = Object.fromEntries(
    Object.entries(fields ?? {}).filter(([, v]) => v !== undefined)
  ) as Record<string, string | number | boolean>
  rootLogger.error({ err: normalized, ...merged }, message)
}
