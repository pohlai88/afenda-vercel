# ADR-0032 — Drizzle migration agent ownership (PRIORITY #1)

**Status:** Accepted  
**Date:** 2026-05-19  
**Relates to:** [ADR-0007](./0007-turborepo-single-package-verify-cache.md) (`lint:drizzle-journal` in verify) · **AGENTS.md PRIORITY #1** · `.cursor/rules/drizzle-migration-ledger.mdc` · `scripts/check-drizzle-journal.mjs`

---

## Context

Afenda uses **Neon Postgres** with **Drizzle ORM**. Schema truth lives in `lib/db/schema.ts`; DDL evidence lives in `drizzle/*.sql`; order and apply discipline live in `drizzle/meta/_journal.json` and drizzle-kit snapshots.

**Incident (21-SQL / 7-journal):** duplicate `0005_*` / `0006_*` prefixes, orphan SQL files, hand-edited `prevId` in snapshots, and `db:push` bypassing the journal. SQL count diverged from journal entries. Recovery required reverting mistaken generate output — not bulk-deleting files or asking operators to reset production.

**Why violations still happen despite a Cursor rule:**

| Gap | Effect |
| --- | --- |
| `drizzle-migration-ledger.mdc` had `alwaysApply: false` | Agents editing feature code never see PRIORITY #1 unless they touch `drizzle/**` or `schema.ts` |
| Rule glob missed `.config/drizzle.config.ts` | Config edits did not load the rule |
| Rule was not in `check-agent-contract` required files | Rule file could be deleted or weakened without CI failure |
| `lint:drizzle-journal` only checked SQL ↔ journal tags | Missing/orphan snapshots (`0001_snapshot.json` gap) slipped through until `db:generate` or CI elsewhere failed |
| `db:push*` in `package.json` | Was an easy escape hatch — now hard-fail stubs via `scripts/forbid-db-push.mjs` (enforced by `check-agent-contract.mjs`) |
| Docs split across AGENTS + rule only | No ADR for “why agents own migrate” — easy to treat as optional hygiene |

---

## Decision

### PRIORITY #1 — agents own local generate + migrate; humans do not

```txt
IDE / agent runs:  pnpm db:generate  →  pnpm lint:drizzle-journal  →  pnpm db:migrate:local
Human does NOT run db:generate, db:migrate:local, db:push*, or DB reset. Do not ask.
```

**Allowed local path (one schema change):**

1. Edit `lib/db/schema.ts` only (`neon_auth.*` has no app DDL — mirror in `lib/db/schema-neon-auth.ts`).
2. `pnpm db:generate` — **abort** if drizzle-kit prompts for rename disambiguation (no TTY).
3. `pnpm lint:drizzle-journal` — **must pass** (SQL count, journal tags, snapshot parity).
4. `pnpm db:migrate:local` — apply journal SQL to local Neon.
5. Commit atomically: `lib/db/schema.ts` + `drizzle/*.sql` + `drizzle/meta/*`.

One schema change → one generate → one journal row. **Commit before generating again.**

### Forbidden for agents (instant failure)

| Action | Why |
| --- | --- |
| `pnpm db:push` / `pnpm db:push:local` | Overwrites DB without journal discipline |
| Hand-edit `drizzle/*.sql`, `_journal.json`, `*_snapshot.json` | Corrupts drizzle-kit baseline |
| Bulk-delete orphan SQL / patch `prevId` by hand | Caused 21-vs-7 incident |
| `node scripts/drizzle-migrate-logged.mjs` directly | Use `pnpm db:migrate:local` |
| `node scripts/nuke-db-public.mjs` | Destructive |
| Asking human to run generate/migrate/reset | Agent-owned per this ADR |
| `drizzle-kit` CLI except via `pnpm db:generate` | Bypass |
| Neon MCP / raw DDL for app-owned tables | Not in journal |

### Doctrine

```txt
lib/db/schema.ts     = schema truth
drizzle/*.sql        = DDL evidence
drizzle/meta/_journal.json = apply order
drizzle/meta/*_snapshot.json = drizzle-kit diff baseline (one per journal tag)
```

If `lint:drizzle-journal` fails: **stop**, do not migrate, do not ask human to reset. Revert mistaken generate output or fix `schema.ts` and run **one** clean `pnpm db:generate`.

---

## Enforcement

| Layer | Mechanism |
| --- | --- |
| **ADR** | This document — canonical “why” for PRIORITY #1 |
| **AGENTS.md** | PRIORITY #1 block + §3 Drizzle migrations (operational copy) |
| **Cursor rule** | `.cursor/rules/drizzle-migration-ledger.mdc` — `alwaysApply: true` |
| **CI** | `pnpm lint:drizzle-journal` in `pnpm lint` / `pnpm verify*` |
| **Agent contract** | Required rule file + ADR path in `scripts/check-agent-contract.mjs` |

---

## Known ledger debt (pre-0032)

Migration `0001_hrm_signature_ceremony` has SQL + journal rows but no `drizzle/meta/0001_snapshot.json`; `0002_snapshot.prevId` still references `0000`. `lint:drizzle-journal` warns and allows this single gap until the next schema change produces a clean `pnpm db:generate` chain. **Do not** hand-create `0001_snapshot.json`.

---

## Consequences

**Positive**

- Single authoritative ADR for agents and humans reviewing schema PRs.
- Mechanical snapshot parity catches ledger damage before migrate/build drift.
- `alwaysApply: true` reduces “I didn’t see the rule” violations on feature-only PRs.

**Negative / discipline**

- Every schema PR must include the full atomic commit (schema + SQL + meta).
- Agents cannot defer migrate to the operator — by design.

---

## Checklist (schema PRs)

- [ ] Only `lib/db/schema.ts` edited for app DDL (no `neon_auth.*` DDL)
- [ ] `pnpm db:generate` (no rename prompt; no second generate without commit)
- [ ] `pnpm lint:drizzle-journal` passes
- [ ] `pnpm db:migrate:local` run on local branch
- [ ] Single commit: schema + `drizzle/*.sql` + `drizzle/meta/*`
- [ ] No `db:push*`, no hand-edited SQL/meta, no orphan snapshot cleanup by hand
