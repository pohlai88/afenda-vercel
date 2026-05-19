import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"
import { createMDX } from "fumadocs-mdx/next"
import createNextIntlPlugin from "next-intl/plugin"
import { withWorkflow } from "workflow/next"

import { betterAuthAllowedHostsFromEnv } from "./lib/site"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")
const withMDX = createMDX()
const LEGAL_DOCS_ROUTE_PREFIX = "/legal-docs"

/** @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions (wildcard origins). */
const serverActionAllowedOrigins = buildServerActionAllowedOrigins(
  betterAuthAllowedHostsFromEnv()
)

const nextConfig: NextConfig = {
  /** Isolated caches for `pnpm dev:stack` (UI `.next-ui` vs workflow `.next-workflow`). */
  distDir: process.env.AFENDA_NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  /**
   * Packages that must not be bundled by webpack and instead resolved via native Node.js `require`.
   *
   * Rules for additions:
   *  1. `pino` / `pino-pretty` — Node transport APIs / optional worker transports.
   *  2. `@opentelemetry/instrumentation` (and `require-in-the-middle`, `@fastify/otel`) — use
   *     dynamic `require(expression)` internally to load plugins at runtime; webpack cannot
   *     statically analyse these calls and emits "Critical dependency" warnings for every
   *     transitive consumer (Sentry → @sentry/node → prisma/fastify/express instrumentations).
   *     Marking them external silences the warnings AND reduces webpack's traversal work.
   *  3. `@vercel/queue` — Vercel Workflow DevKit runtime package that also uses a dynamic
   *     `require(expression)` pattern; same treatment as OTel above.
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages
   */
  serverExternalPackages: [
    "pino",
    "pino-pretty",
    // OpenTelemetry instrumentation packages — dynamic require inside these packages
    // generates webpack "Critical dependency: the request of a dependency is an expression"
    // warnings through the @sentry/nextjs → @sentry/node → prisma/fastify/express chains.
    "@opentelemetry/instrumentation",
    "require-in-the-middle",
    "import-in-the-middle",
    "@fastify/otel",
    // Vercel Workflow DevKit queue runtime — same dynamic-require pattern.
    "@vercel/queue",
  ],
  /**
   * Dev-only verbose fetch logger. Off by default — Nexus snapshot, ERP pages,
   * and ask-docs each issue many parallel server-component fetches per request,
   * so the chatty per-URL output drowns useful signals in the terminal and
   * costs measurable CPU on every Server Component render in dev.
   *
   * Opt in with `AFENDA_DEV_LOG_FETCHES=1` when debugging cache / dedupe or
   * tracing why a particular Server Component is fetching too much. The flag
   * has no effect in production builds (Next.js ignores `logging` in prod).
   *
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/logging
   */
  ...(process.env.AFENDA_DEV_LOG_FETCHES === "1"
    ? { logging: { fetches: { fullUrl: true } } }
    : {}),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
    /**
     * Allowlist local paths for `next/image` optimization on Vercel (`/_next/image`).
     * @see https://vercel.com/docs/image-optimization
     * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/images#localpatterns
     * Keep in sync with `public/` and `#lib/site` brand constants (`/icons/*`, `/afenda-brand/*`).
     */
    localPatterns: [
      { pathname: "/icons/**", search: "" },
      { pathname: "/afenda-brand/**", search: "" },
      { pathname: "/erp-icon/**", search: "" },
    ],
  },
  /**
   * Cache Components — ADR-0023 Phase 2. ERP routes no longer export `force-dynamic`;
   * ask-docs uses `'use cache'` + `cacheLife` instead of segment `revalidate`.
   */
  cacheComponents: true,
  experimental: {
    /**
     * `lucide-react`, `date-fns`, and `recharts` are barrel-optimized by default in Next.js 16.2+
     * (@see nextjs_docs optimizePackageImports). Omit redundant entries; add packages here only when
     * the upstream default list does not cover them.
     */
    staticGenerationRetryCount: 1,
    serverActions: {
      bodySizeLimit: "1mb",
      ...(serverActionAllowedOrigins.length > 0
        ? { allowedOrigins: serverActionAllowedOrigins }
        : {}),
    },
  },
  async headers() {
    const securityHeaders = [
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=()",
      },
    ]

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      })
    }

    // CSP violation reporting → Sentry (report-only: never blocks, always reports).
    // Graduates to enforcing Content-Security-Policy once violations are triaged.
    const cspReportUri = process.env.SENTRY_CSP_REPORT_URI
    if (cspReportUri) {
      securityHeaders.push({
        key: "Content-Security-Policy-Report-Only",
        value: `default-src 'self'; report-uri ${cspReportUri}`,
      })
    }

    return [{ source: "/:path*", headers: securityHeaders }]
  },
  async rewrites() {
    return [
      {
        // Allow AI agents to fetch any ask-docs page as Markdown by appending .md
        source: "/:locale/ask-docs/:path*.md",
        destination: "/llms.mdx/ask-docs/:locale/:path*",
      },
    ]
  },
  async redirects() {
    return [
      {
        source: "/:locale/legal/:path*",
        destination: `/:locale${LEGAL_DOCS_ROUTE_PREFIX}/:path*`,
        permanent: true,
      },
      {
        source: "/:locale/cookies",
        destination: `/:locale${LEGAL_DOCS_ROUTE_PREFIX}/cookies`,
        permanent: true,
      },
      {
        source: "/:locale/data-processing-addendum",
        destination: `/:locale${LEGAL_DOCS_ROUTE_PREFIX}/data-processing-addendum`,
        permanent: true,
      },
      {
        source: "/:locale/subprocessors",
        destination: `/:locale${LEGAL_DOCS_ROUTE_PREFIX}/subprocessors`,
        permanent: true,
      },
      {
        source: "/:locale/status",
        destination: `/:locale${LEGAL_DOCS_ROUTE_PREFIX}/status`,
        permanent: true,
      },
      // Legacy IAM bootstrap URL → first-run setup (ADR-0003).
      {
        source: "/:locale/onboarding",
        destination: "/:locale/bootstrap",
        permanent: true,
      },
      // ERP module URLs: /dashboard → /apps (ADR-0029).
      {
        source: "/:locale/o/:orgSlug/dashboard/:path*",
        destination: "/:locale/o/:orgSlug/apps/:path*",
        permanent: true,
      },
      {
        source: "/:locale/o/:orgSlug/dashboard",
        destination: "/:locale/o/:orgSlug/nexus",
        permanent: true,
      },
      // Capability registry UI retired — utility resolution stays in #features/marketplace (ADR-0029).
      {
        source: "/:locale/o/:orgSlug/marketplace/:path*",
        destination: "/:locale/o/:orgSlug/nexus",
        permanent: true,
      },
      {
        source: "/:locale/o/:orgSlug/marketplace",
        destination: "/:locale/o/:orgSlug/nexus",
        permanent: true,
      },
      // Platform console: legacy operator URLs → /platform (vendor-internal).
      {
        source: "/:locale/operator",
        destination: "/:locale/platform",
        permanent: true,
      },
      {
        source: "/:locale/operator/:path*",
        destination: "/:locale/platform/:path*",
        permanent: true,
      },
      {
        source: "/:locale/o/:orgSlug/operator",
        destination: "/:locale/platform",
        permanent: true,
      },
      {
        source: "/:locale/o/:orgSlug/operator/:path*",
        destination: "/:locale/platform/:path*",
        permanent: true,
      },
    ]
  },
}

/**
 * Skip the `withWorkflow()` plugin on dev/typegen paths that don't need it.
 *
 * Two skip triggers, both refused when `VERCEL=1` (Vercel's build environment
 * auto-injects this — a stale env var in project settings can never strip the
 * workflow route handler from a real production build):
 *
 *   1. `AFENDA_SKIP_WORKFLOW_PLUGIN === "1"` — explicit opt-out, set only by
 *      `scripts/next-typegen-fast.mjs` (driven by `pretypecheck`). The plugin's
 *      output files are routes at `/.well-known/workflow/v1/*` that no
 *      application code imports as typed routes; they're HTTP-only endpoints
 *      for the workflow runtime. Skipping directive discovery during typegen
 *      saves ~15s per `pnpm gate` invocation.
 *   2. `AFENDA_NEXT_DIST_DIR === ".next-ui"` (with `NODE_ENV !== "production"`)
 *      — the dev:stack UI dev process. On Windows the plugin writes its
 *      generated route handler (`app/.well-known/workflow/v1/flow/route.js`)
 *      via tmp-then-rename; when Turbopack has the route module open, the
 *      rename can stall, leaving orphan `.tmp` files in `app/`. Turbopack's
 *      watcher sees those tmp files appear → recompile → workflow plugin
 *      watcher fires → re-bundle → another tmp → infinite write-amplification
 *      loop. `cacheComponents: true` tightens it.
 *
 * `next typegen`, `next build`, `next start`, and `next lint` all set
 * `NODE_ENV=production` internally, so NODE_ENV alone cannot distinguish
 * typegen from build — the explicit env var is the authoritative signal.
 *
 * The UI process never serves `/.well-known/workflow/v1/*` — that's hosted by
 * the separate workflow Next dev server on port 3002 (ADR-0039). Server
 * Actions on the UI process dispatch via `start()` from `workflow/api`, which
 * is a runtime HTTP call to the workflow server, not the Next plugin.
 *
 * Vercel production builds → plugin always enabled. The standalone workflow
 * dev process (`.next-workflow`) → plugin enabled. Plain `pnpm dev` keeps
 * the plugin (single-process dev for users who want local workflow execution
 * from one server).
 */
const SKIP_WORKFLOW_PLUGIN =
  process.env.VERCEL !== "1" &&
  (process.env.AFENDA_SKIP_WORKFLOW_PLUGIN === "1" ||
    (process.env.NODE_ENV !== "production" &&
      process.env.AFENDA_NEXT_DIST_DIR === ".next-ui"))

const composedConfig = withNextIntl(withMDX(nextConfig))
const coreConfig = SKIP_WORKFLOW_PLUGIN
  ? composedConfig
  : withWorkflow(composedConfig)

/**
 * Always wrap with withSentryConfig so the webpack plugin runs unconditionally —
 * this silences the OTel "Critical dependency" warnings by applying Sentry's
 * server-external rules even when SENTRY_AUTH_TOKEN is absent (local dev).
 * Source-map upload is gated on SENTRY_AUTH_TOKEN being present.
 */
export default withSentryConfig(coreConfig, {
  org: "afenda",
  project: "javascript-nextjs",
  // Upload source maps to Sentry when auth token is available (CI / Vercel production)
  ...(process.env.SENTRY_AUTH_TOKEN
    ? {
        authToken: process.env.SENTRY_AUTH_TOKEN,
        widenClientFileUpload: true,
        sourcemaps: { deleteSourcemapsAfterUpload: true },
      }
    : {}),
  // Proxy Sentry ingest through /monitoring to bypass ad-blockers
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
})

/**
 * Host allowlist for Server Actions (CSRF / reverse-proxy safety).
 * On Vercel preview deployments, add `*.vercel.app` so branch URLs work without listing every host
 * (see Vercel `VERCEL_ENV` and Next.js `allowedOrigins` wildcard support).
 */
function buildServerActionAllowedOrigins(hosts: string[]) {
  const list = [...new Set(hosts.filter(Boolean))]
  if (process.env.VERCEL_ENV === "preview") {
    return [...new Set([...list, "*.vercel.app"])]
  }
  return list
}
