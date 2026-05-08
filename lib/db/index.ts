import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "#lib/db/schema"

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (url) {
    return url
  }
  // Next.js evaluates server modules during `next build`; Neon is not contacted until query time.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "postgresql://build:build@127.0.0.1:5432/build"
  }
  throw new Error("DATABASE_URL is not set")
}

/**
 * Neon serverless over HTTP (`neon` + `drizzle-orm/neon-http`).
 *
 * - **Pooling:** use a pooled connection string (`…-pooler…` hostname) for Vercel/serverless so you
 *   stay under Postgres `max_connections` ([Neon pooling](https://neon.tech/docs/connect/connection-pooling)).
 * - **Migrations:** prefer a direct (non-pooler) URL via `DATABASE_URL_UNPOOLED` for Drizzle CLI only
 *   (`drizzle.config.ts`) — transaction-pooled modes can surprise migration tooling.
 * - **Next.js:** the driver uses `fetch`; disable Data Cache coupling so queries are never served stale.
 *
 * @see https://neon.tech/docs/serverless/serverless-driver
 */
const sql = neon(getDatabaseUrl(), {
  fetchOptions: { cache: "no-store" },
})

export const db = drizzle(sql, { schema })
