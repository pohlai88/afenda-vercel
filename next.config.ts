import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"
import { withWorkflow } from "workflow/next"

import { betterAuthAllowedHostsFromEnv } from "./lib/site"

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

/** @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions (wildcard origins). */
const serverActionAllowedOrigins = buildServerActionAllowedOrigins(
  betterAuthAllowedHostsFromEnv()
)

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
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
    ],
  },
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

    return [{ source: "/:path*", headers: securityHeaders }]
  },
}

export default withWorkflow(withNextIntl(nextConfig))

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
