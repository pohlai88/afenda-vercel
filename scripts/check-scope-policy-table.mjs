import { neon } from "@neondatabase/serverless"
import pg from "pg"

const pooled = process.env.DATABASE_URL?.trim()
const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim()
if (!pooled) {
  console.error("DATABASE_URL missing")
  process.exit(1)
}
console.log("pooled host:", new URL(pooled).host)
if (unpooled) console.log("unpooled host:", new URL(unpooled).host)
const sql = neon(unpooled || pooled)
const url = unpooled || pooled
const rows = await sql`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'org_operational_scope_policy'
`
console.log("host:", new URL(url).host)
console.log("org_operational_scope_policy:", rows.length > 0 ? "exists" : "MISSING")
const mig = await sql`
  SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY created_at
`
console.log("applied migrations:", mig.length)
if (mig.length > 0) {
  console.log("first:", mig[0].id)
  console.log("last:", mig[mig.length - 1].id)
}
const hrm = await sql`
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE 'hrm_flexible%'
`
console.log("hrm_flexible tables:", hrm.map((r) => r.tablename))
const count = await sql`
  SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'
`
console.log("public table count:", count[0]?.n)
const sig = await sql`
  SELECT tablename, schemaname FROM pg_tables
  WHERE tablename = 'hrm_signature_event'
`
console.log("hrm_signature_event (neon):", sig)
const pool = new pg.Pool({ connectionString: url })
const pgTables = await pool.query(
  `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public'`
)
const pgSig = await pool.query(
  `SELECT tablename FROM pg_tables WHERE tablename = 'hrm_signature_event'`
)
const pgMig = await pool.query(
  `SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`
)
console.log("pg pool public tables:", pgTables.rows[0]?.n)
console.log("pg pool hrm_signature_event:", pgSig.rows.length > 0)
console.log("pg pool migrations:", pgMig.rows[0]?.n)
await pool.end()
