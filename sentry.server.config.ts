import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    /**
     * Skip Sentry's OTel bootstrap. The Node runtime already registers
     * `@vercel/otel` from `instrumentation.node.ts`, which installs its own
     * global `TracerProvider` plus HTTP/fetch/etc. auto-instrumentations.
     * Without this flag, both SDKs register competing global providers and
     * parallel HTTP auto-instrumentations on every cold start — the second one
     * wins, but both incur init cost, hold span-processor queues, and can
     * emit duplicate spans. AGENTS.md splits responsibility cleanly:
     *   • OpenTelemetry (`@vercel/otel`) → execution map / traces
     *   • Sentry (`@sentry/nextjs`)      → incident inbox / errors
     * Errors, breadcrumbs, source maps, server-action wrapping, and
     * `captureException` all work without Sentry owning the tracer.
     */
    skipOpenTelemetrySetup: true,
    sendDefaultPii: false,
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    /**
     * No-op while `skipOpenTelemetrySetup: true` — Sentry has no tracer
     * provider to sample from. Kept (with env-var override) so a future
     * reversal of the OTel ownership decision is a single-line change.
     */
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? "0"),
    profilesSampleRate: Number(process.env.SENTRY_PROFILES_SAMPLE_RATE ?? "0"),
    includeLocalVariables: true,
    enableLogs: true,
    tracePropagationTargets: ["localhost", /^https:\/\/www\.nexuscanon\.com/],
  })
}
