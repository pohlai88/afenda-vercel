/**
 * Node.js-only instrumentation bootstrap (Pino, Sentry server, Vercel OTEL).
 * Loaded from root {@link ./instrumentation.ts} only when `NEXT_RUNTIME === "nodejs"`.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation — conditional `NEXT_RUNTIME` imports
 */
export async function registerNodeInstrumentation(): Promise<void> {
  await import("./sentry.server.config")
  /** Warm Pino once per Node server process; transport/init failures surface here, not mid-request. */
  await import("#lib/logger.server")
  const { registerOTel } = await import("@vercel/otel")
  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "afenda-vercel",
  })
}
