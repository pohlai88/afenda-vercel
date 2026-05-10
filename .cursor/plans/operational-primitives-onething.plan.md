# Plan — Operational primitives + OneThing (todos)

**Sources of truth:** [`AGENTS.md`](../../AGENTS.md) §5 (Operational primitives) + §6 (`lib/erp/`) · [`.cursor/rules/onething-directory.mdc`](../../.cursor/rules/onething-directory.mdc)

## Phase A — Shared kernel (`lib/erp/`) — **done**

| Deliverable                                                                                | Status                 |
| ------------------------------------------------------------------------------------------ | ---------------------- |
| `temporal-spine.shared.ts` — `TemporalObject`, Zod, `asTemporal` / `asTemporalFromColumns` | Done                   |
| `crud-sap.shared.ts` — CRUD-SAP + `buildErpAuditAction`                                    | Done                   |
| `audit-7w1h.shared.ts` + `audit-7w1h.server.ts` — 7W1H + `writeAuditEvent7W1H`             | Done                   |
| Vitest `tests/unit/erp-*.test.ts`                                                          | Done                   |
| No `lib/erp/index.ts` barrel mixing server + client graphs                                 | Intentional per AGENTS |

## Phase A.1 — Plan / ADR / AGENTS alignment — **done (this pass)**

| Gap closed                             | Notes                                                                                                                                                                 |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Column naming drift                    | ADR + AGENTS aligned on `temporalPast` / `temporalNow` / `temporalNext` on `todo`; `asTemporalFromColumns` accepts snake_case, camelCase, and legacy `*_context` keys |
| IAM examples                           | `erp.todo.onething.*` strings added to AGENTS §5 IAM audit policy example list                                                                                        |
| Duplicate `AuditEvent7W1H` type in ADR | ADR §7 defers to `#lib/erp/audit-7w1h.shared`                                                                                                                         |
| Missing tracked plan                   | This file                                                                                                                                                             |

## Phase B — `todo` schema + `lib/features/todos` — **done (code + tests)**

Shipped:

- `lib/db/schema.ts` — nullable OneThing columns + `todo_organization_id_one_thing_state_idx`
- `drizzle/0001_todo_onething.sql` + journal row `0001_todo_onething`
- `schemas/todo-onething.schema.ts`, `data/todo-onething-state.server.ts`, `data/todo-audit.server.ts`, `data/todo-prediction.server.ts`
- Ranker boosts + critical prediction +20 in `todo-rank.shared.ts`
- Server Actions: `resolve-org-onething`, `resolve-personal-onething`, `deprecate-org-onething`, `deprecate-personal-onething` (typed expected-error results on resolve; auth inside each action per [Mutating data](https://nextjs.org/docs/app/getting-started/mutating-data))
- `todos.queries.server.ts` hydration + `index.ts` exports
- Vitest: `tests/unit/todos/todo-onething.test.ts`, fixtures updated in `todo-rank` / `todo-page-view`

**Operator:** run `pnpm db:migrate:local` (or `:vercel`) against each Neon branch so `ALTER TABLE "todo"` applies.

**Next.js / production notes:** Server-only writers stay in `*.server.ts` with `import "server-only"`; Server Actions validate `FormData` with Zod, gate with `requireOrgSession` / `requireAuthShellSignedInSession`, mutate, audit, then `revalidatePath` per [Next.js `use server` / data security](https://nextjs.org/docs/app/api-reference/directives/use-server).
