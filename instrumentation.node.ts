/**
 * Node.js-only instrumentation bootstrap (Pino, Sentry server, Vercel OTel).
 * Loaded from root {@link ./instrumentation.ts} only when `NEXT_RUNTIME === "nodejs"`.
 *
 * The three subsystems have no inter-dependencies — Sentry's OTel bootstrap
 * is disabled (`skipOpenTelemetrySetup: true` in `sentry.server.config.ts`),
 * so `@vercel/otel` owns the global `TracerProvider` regardless of init
 * order. Resolving the three module imports in parallel shaves a small but
 * real chunk off every Node worker cold start.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation — conditional `NEXT_RUNTIME` imports
 */
export async function registerNodeInstrumentation(): Promise<void> {
  const [, , otelModule] = await Promise.all([
    /** Sentry must finish initialising before requests, but does not block the others. */
    import("./sentry.server.config"),
    /** Warm Pino once per Node server process; transport/init failures surface here, not mid-request. */
    import("#lib/logger.server"),
    import("@vercel/otel"),
  ])

  otelModule.registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME ?? "afenda-vercel",
  })
}
