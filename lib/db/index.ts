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

const sql = neon(getDatabaseUrl())

export const db = drizzle(sql, { schema })
