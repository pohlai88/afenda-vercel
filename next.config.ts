import type { NextConfig } from "next"

/** @see https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions (wildcard origins). */
const serverActionAllowedOrigins = buildServerActionAllowedOrigins(
  process.env.BETTER_AUTH_TRUSTED_ORIGINS,
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
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
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

export default nextConfig

/**
 * Host allowlist for Server Actions (CSRF / reverse-proxy safety).
 * On Vercel preview deployments, add `*.vercel.app` so branch URLs work without listing every host
 * (see Vercel `VERCEL_ENV` and Next.js `allowedOrigins` wildcard support).
 */
function buildServerActionAllowedOrigins(raw: string | undefined) {
  const hosts = parseServerActionAllowedOrigins(raw)
  if (process.env.VERCEL_ENV === "preview") {
    return [...new Set([...hosts, "*.vercel.app"])]
  }
  return hosts
}

function parseServerActionAllowedOrigins(raw: string | undefined) {
  if (!raw) return []

  return [
    ...new Set(
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => {
          try {
            return new URL(value).host
          } catch {
            return value.replace(/^https?:\/\//, "").replace(/\/+$/, "")
          }
        })
        .filter(Boolean),
    ),
  ]
}
