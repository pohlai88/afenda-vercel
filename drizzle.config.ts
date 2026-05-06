import { loadEnvConfig } from "@next/env"
import { defineConfig } from "drizzle-kit"

/** Same env file resolution as Next.js (matches legacy afenda-next `drizzle.config.ts`). */
loadEnvConfig(process.cwd())

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
