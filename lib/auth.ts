import { betterAuth } from "better-auth"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { nextCookies } from "better-auth/next-js"
import { organization } from "better-auth/plugins"

import { db } from "#lib/db"
import * as schema from "#lib/db/schema"

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : [],
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
