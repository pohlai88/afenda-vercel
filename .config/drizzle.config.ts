import { loadEnvConfig } from "@next/env"
import { defineConfig } from "drizzle-kit"

/** Same env file resolution as Next.js (matches legacy afenda-next `drizzle.config.ts`). */
loadEnvConfig(process.cwd())

/** Direct / unpooled URL avoids PgBouncer transaction-pooling edge cases during DDL migrations. */
function drizzleDatabaseUrl(): string {
  const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim()
  if (unpooled) return unpooled
  const pooled = process.env.DATABASE_URL
  if (!pooled) {
    throw new Error(
      "DATABASE_URL is not set (optional DATABASE_URL_UNPOOLED not provided)"
    )
  }
  return pooled
}

export default defineConfig({
  /** Resolved from repo root when using `--config .config/drizzle.config.ts`. */
  schema: "lib/db/schema.ts",
  out: "drizzle",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: drizzleDatabaseUrl(),
  },
})
