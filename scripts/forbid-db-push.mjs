/**
 * Hard block for drizzle-kit push (ADR-0032).
 * `db:push*` bypasses drizzle/meta/_journal.json and caused ledger drift.
 */
console.error(
  `[forbid-db-push] pnpm db:push is disabled — it bypasses the migration journal and caused SQL/journal drift (ADR-0032).

Use the journal path instead:
  1. Edit lib/db/schema.ts
  2. pnpm db:generate
  3. pnpm lint:drizzle-journal
  4. pnpm db:migrate:local

See AGENTS.md PRIORITY #1 and docs/decisions/0032-drizzle-migration-agent-ownership.md`
)
process.exit(1)
