import { betterAuth } from "better-auth"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { nextCookies } from "better-auth/next-js"
import { organization } from "better-auth/plugins"

import { db } from "#lib/db"
import * as schema from "#lib/db/schema"

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build"

function trustedOriginsFromEnv(): string[] {
  const out = new Set<string>()
  const base = process.env.BETTER_AUTH_URL?.trim()
  if (base) out.add(base)
  const csv = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.trim()
  if (csv) {
    for (const o of csv.split(",")) {
      const x = o.trim()
      if (x) out.add(x)
    }
  }
  return [...out]
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: trustedOriginsFromEnv(),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (isProductionBuild
      ? "build-phase-placeholder-secret-min-32-chars!!"
      : undefined),
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (isProductionBuild ? "http://localhost:3000" : undefined),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [organization(), nextCookies()],
})
