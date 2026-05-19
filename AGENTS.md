# Agent guide — afenda-vercel

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Neon Postgres · Drizzle ORM

**Read before every task:** **PRIORITY #1** (Drizzle) · **PRIORITY #2** (IDE three-layer drift) · §4 (enforcement gates) · §5 (ERP + routing) · §6 (directory contract — **§6.1 `lib/` root allowlist**, §6.2 subtrees, §6.3 anti-drift).

---

## PRIORITY #1 — Drizzle migrations (agents own local; humans do not)

**Canonical decision:** [ADR-0032](docs/decisions/0032-drizzle-migration-agent-ownership.md) · **Rule:** `.cursor/rules/drizzle-migration-ledger.mdc` (`alwaysApply: true`)

```txt
YOU (IDE / agent) run local schema migrations end-to-end.
The human operator will NOT run pnpm db:generate.
The human operator will NOT run pnpm db:migrate:local.
The human operator will NOT reset, nuke, or “help fix” the database for you.

Do not ask. Do not defer. Do not output “manual steps for the human.”
```

**Your only allowed local migration path:**

1. Edit `lib/db/schema.ts`
2. `pnpm db:generate` (abort if drizzle-kit prompts for rename disambiguation — stop and fix schema without spawning parallel migrations)
3. `pnpm lint:drizzle-journal` — **must pass** before migrate
4. `pnpm db:migrate:local`
5. Commit `lib/db/schema.ts` + `drizzle/*.sql` + `drizzle/meta/*` together

**Never destroy the ledger again.** The 21-SQL / 7-journal incident (duplicate `0005_*` / `0006_*`, orphan files, snapshot `prevId` collisions) was caused by bypassing this pipeline. That class of damage is **unacceptable** — agents are accountable for keeping SQL ↔ journal ↔ snapshots consistent.

**Forbidden (instant failure):**

- `pnpm db:push` / `pnpm db:push:local` — **hard-fail stubs** (`scripts/forbid-db-push.mjs`); never bypass the journal
- Hand-editing `drizzle/*.sql` or `drizzle/meta/*` (except: never — use `db:generate` only)
- Bulk-deleting orphan SQL or “repairing” snapshots without a single coherent `db:generate` outcome
- `node scripts/nuke-db-public.mjs` or asking the human to reset Neon
- Running `db:generate` repeatedly in one session without committing (creates competing migrations)
- Neon MCP / raw DDL for app-owned tables

Full rules: [§3 Drizzle migrations](#drizzle-migrations) · [ADR-0032](docs/decisions/0032-drizzle-migration-agent-ownership.md).

---

## PRIORITY #2 — IDE anti-drift: three-layer surfaces (agents MUST NOT drift)

**Canonical decision:** [ADR-0035](docs/decisions/0035-three-layer-surface-ide-anti-drift.md) · **Rule:** `.cursor/rules/legal-docs-directory.mdc` (legal-docs); parallel rules for auth, IAM profile, org-admin, portal, …

```txt
WARNING — IDE / CURSOR / AGENT:

You are the #1 source of architecture drift in this repo.
Humans find code by PRODUCT NAME on disk. You invent parallel folders and call it "refactor."

STOP before creating or moving files:

  Layer 1 — app/                    → thin routes + re-exports ONLY
  Layer 2 — lib/features/<name>/    → truth: routing, registry, cache, dispatch, actions
  Layer 3 — components2/<name>/     → paint: shells, cards, client islands ONLY

ONE product name across all three layers (example: legal-docs — NOT public-trust + legal-declarations + marketing).

FORBIDDEN (instant failure — fix forward, never shim):
  • Business logic, fetch, slug dispatch, or generateMetadata in app/
  • Presentation shells for a product in the wrong components2/ folder (e.g. legal-docs UI in marketing/)
  • Sibling feature modules for the same URL tree (public-trust, legal-declarations — RETIRED)
  • _SEAL.md at lib/features/<module>/ root (check-agent-contract rejects it)
  • Recreating repo-root components/ (hard-deleted)

WHEN EDITING A SURFACE — read its *-directory.mdc rule FIRST:
  legal-docs → .cursor/rules/legal-docs-directory.mdc
  auth       → .cursor/rules/iam-directory.mdc + app/(auth)/_SEAL.md
  iam-profile→ lib/features/iam-profile/ + components2/iam-profile/ (rule: iam-profile-directory.mdc)

If you cannot state which layer owns a file in one sentence, STOP and read ADR-0035.
```

**Legal-docs doors (locked):**

| Layer | Path | Import |
| --- | --- | --- |
| 1 | `app/(main)/[locale]/legal-docs/` | re-export `#features/legal-docs` only |
| 2 | `lib/features/legal-docs/` | `#features/legal-docs` |
| 3 | `components2/legal-docs/` | `#components2/legal-docs` |

**Verify after any legal-docs / three-layer touch:**

```bash
pnpm lint:path -- lib/features/legal-docs components2/legal-docs
pnpm test:fast -- tests/unit/legal-docs-surface-contract.test.ts
node scripts/check-agent-contract.mjs   # no forbidden lib/features/legal-docs/_SEAL.md
```

Full doctrine: [ADR-0035](docs/decisions/0035-three-layer-surface-ide-anti-drift.md) · [§6.3 anti-drift](#63-anti-drift-doctrine).

---

## Non-negotiable boundaries

| Boundary             | Rule                                                                                                                                                                                                                                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Module public door   | `lib/features/<module>/index.ts` only — no cross-module deep imports                                                                                                                                                                                                                                |
| ERP business logic   | `lib/features/<module>/` only — never in `app/`, `proxy.ts`, or `lib/erp/`                                                                                                                                                                                                                          |
| `app/` layer         | Routing, composition, page wiring only                                                                                                                                                                                                                                                              |
| Mutations            | Server Actions by default; Route Handlers only for `auth`, `cron`, `upload`, `webhooks`, `integrations`, `api/erp/<module>`                                                                                                                                                                         |
| `proxy.ts`           | Session/locale gate only — no DB, no business logic                                                                                                                                                                                                                                                 |
| Portal control plane | `lib/portal/` only — portal slug, path, resolver, guard, and audience contracts; no ERP business logic                                                                                                                                                                                              |
| Banned categories    | `services`, `utils`, `helpers`, `repositories`, `controllers` — forbidden unless AGENTS.md updated first (exception: `lib/utils.ts` — shadcn `cn()` door; see [§6.1](#61-lib-root-allowlist-exhaustive))                                                                                          |
| `lib/` root          | Only [§6.1](#61-lib-root-allowlist-exhaustive) allowlisted files at `lib/*.ts` — all other code lives in a named subtree ([§6.2](#62-required-lib-subtrees))                                                                                                                                        |
| IAM session guards   | `requireOrgSession`, `getOrgTenantContext`, `getOrgSessionFromRequest`, etc. from **`#lib/auth` only** — not `#lib/tenant` (retired door; removed in lib-nesting PR3)                                                                                                                                |
| Doc accuracy         | AGENTS.md path references must match disk in the same PR that moves or renames files ([§6.3](#63-anti-drift-doctrine))                                                                                                                                                                              |
| Root cleanliness     | No dump dirs at repo or module root                                                                                                                                                                                                                                                                 |
| UI primitives        | **`components/` is hard-deleted.** Import via `#components2/ui/*` only; shelf on disk is `components2/ui/**`. Never recreate repo-root `components/`.                                                                                                                                              |
| Design tokens        | `@theme inline var(--)` must resolve to `:root`/`.dark` definitions                                                                                                                                                                                                                                 |
| Change governance    | New architectural category → update **this file first**, then implement                                                                                                                                                                                                                             |
| Schema migrations    | **PRIORITY #1:** Agent runs `pnpm db:generate` → `lint:drizzle-journal` → `pnpm db:migrate:local`. Human **never** runs generate/migrate/reset. No `db:push*`, no hand-edited `drizzle/`, no ledger destruction. See [PRIORITY #1](#priority-1--drizzle-migrations-agents-own-local-humans-do-not). |
| IDE three-layer drift | **PRIORITY #2:** One product name across `app/` + `lib/features/<name>/` + `components2/<name>/`. No parallel modules, no app-layer fetch/dispatch, no `_SEAL.md` at `lib/features/*` root. See [PRIORITY #2](#priority-2--ide-anti-drift-three-layer-surfaces-agents-must-not-drift) · [ADR-0035](docs/decisions/0035-three-layer-surface-ide-anti-drift.md). |
| Deleted `components/` | **Entire repo-root `components/` directory is hard-deleted** — never mkdir or restore any file under it; fix forward in `components2/` (`.cursor/rules/never-restore-deleted-components.mdc`, always on) |
| `app/` page thickness | `page.tsx` ≤ params + guards + single feature RSC export; no domain fetch graphs in `app/` |
| Cache Components | `cacheComponents: true` in `next.config.ts` (ADR-0023 Phase 2). No segment `dynamic`/`revalidate`/`runtime` exports under `app/`. Ask-docs uses `'use cache'` + `cacheLife`. Verify with `pnpm build -- --debug-prerender`. |
| Client vs server barrels | **`"use client"` / `*.client.tsx`** import **`#features/<module>/client`** (or allowed `schemas/` / `*.shared` paths) — **not** `#features/<module>` when `index.ts` is a server barrel. See **ADR-0030** · `.cursor/rules/module-client-server-barrels.mdc`. |

---

## Quickstart

| Goal                           | Where                                                                                                                                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jump to topic                  | [Contents](#contents)                                                                                                                                                                                                                                                                             |
| App shell (post-login)         | **`#app-shell`** (`components2/app-shell/`) — `AppShell` slot API (`utilityBar`, `rail`, `command`, `overlay`, `envelope`). Client chrome: **`#app-shell/client`**. Providers `components2/providers/`; stores `components2/stores/`. Rules: `shell-directory.mdc`, `components2-directory.mdc`, `never-restore-deleted-components.mdc` |
| Metadata renderers             | `#components2/metadata` · `#features/governed-surface` (`GovernedPatternCListSection`, `GovernedSurfaceSectionCard`) · `pnpm gen governed-renderer` · **ADR-0026** · section score: `docs/architecture/governed-section-composition-score.md` · dev: `/dev/pattern-c-section-gallery` |
| Nexus (org root)               | `app/[locale]/o/[orgSlug]/nexus/` · `#features/nexus` · redirected from `/{locale}/o/{orgSlug}`. See §5                                                                                                                                                                                           |
| ERP feature                    | `lib/features/<module>/` · `#features/<module>` only · no deep imports · see §6                                                                                                                                                                                                                   |
| Orbit / Planner                | `lib/features/planner/` · product name Orbit · see ADR-0006 · rule `.cursor/rules/planner-directory.mdc`                                                                                                                                                                                          |
| HRM                            | `lib/features/hrm/` · `HRM_CAPABILITIES` registry · `#features/hrm/client` for forms · `#features/hrm/server` for rule-pack                                                                                                                                                                       |
| Tools                          | `lib/features/tools/` · `#features/tools` · `#features/tools/client` · `#features/tools/server` · subsystems: `bulk-csv-import/`, `electronic-signatures/` · HRM consumes; does not re-export                                                                                                      |
| ERP RBAC                       | `lib/features/erp-rbac/` · tenant governance overlays + ERP permission guards · `#features/erp-rbac/server` for server-only guards/queries                                                                                                                                                        |
| Lynx / Knowledge               | `lib/features/lynx/` · `#features/lynx/client` for client islands · rule `.cursor/rules/lynx-knowledge.mdc`                                                                                                                                                                                       |
| Org Messenger (Ably)           | `lib/features/messenger/` · `#features/messenger/client` (panel) · `#features/messenger/server` (token mint) · `ABLY_API_KEY` in `.env.config` → `pnpm env:sync` · workbench rail `right.messenger` (chat) + `right.coordination` (operational console) · `POST /api/erp/messenger/auth`          |
| Org admin                      | `lib/features/org-admin/` · `ORG_ADMIN_CAPABILITIES` registry · `/o/{orgSlug}/admin/*` · rule `.cursor/rules/org-admin-directory.mdc`                                                                                                                                                             |
| Member profile (IAM)           | `lib/features/iam-profile/` · `#components2/iam-profile` · `/o/{orgSlug}/iam-profile/*` (legacy `/account` → 308 + session redirect) · `organizationIamProfilePath` · rule `.cursor/rules/iam-profile-directory.mdc` · `IamProfileSurface` i18n |
| Public legal-docs / trust      | **Layer 1** `app/[locale]/legal-docs/` · **Layer 2** `#features/legal-docs` · **Layer 3** `#components2/legal-docs` · rule `.cursor/rules/legal-docs-directory.mdc` · never recreate `public-trust` / `legal-declarations` |
| Portals                        | `app/[locale]/p/[portalSlug]/` · `lib/portal/` · `components2/portal-shell/` · rule `.cursor/rules/portal-directory.mdc`                                                                                                                                                                          |
| Platform admin                 | `lib/features/platform-admin/` · `PLATFORM_ADMIN_CAPABILITIES` · `/platform/*` (legacy `/operator/*` → 308)                                                                                                                                                                                       |
| Operational primitives         | `#lib/erp/temporal-spine.shared` · `#lib/erp/crud-sap.shared` · `#lib/erp/audit-7w1h.{shared,server}`                                                                                                                                                                                             |
| Workflow DevKit                | `#features/execution` contract · `enqueueOrgImportJobWorkflowRun` · [useworkflow.dev](https://useworkflow.dev/)                                                                                                                                                                                   |
| Operational simulation         | `#features/simulation` · `AFENDA_ENABLE_SIMULATION=1` · rule `.cursor/rules/simulation-directory.mdc`                                                                                                                                                                                             |
| Working Memory Rail            | `#features/rail-memory` · `WorkbenchRail` slots · `iam.workbench.*` audits                                                                                                                                                                                                                        |
| i18n                           | `#i18n/navigation` (client) · `toLocalePath` (server) · `localePrefix: "always"` · rule `.cursor/rules/i18n-directory.mdc` · **ADR-0028** (temporary English-only refactor gate — resume full locales before deploy)                                                                               |
| DB / Drizzle                   | `lib/db/schema.ts` · **agents:** `pnpm db:generate` → `pnpm db:migrate:local` only · **ADR-0032** · rule `.cursor/rules/drizzle-migration-ledger.mdc`                                                                                                                                             |
| Auth / IAM                     | `#lib/auth` (server — session guards, step-up, audit) · `#lib/auth-client` (browser) · session guards **only** from `#lib/auth` · rule `.cursor/rules/iam-directory.mdc` · lib layout [§6.1–6.3](#6-directory-contract)                                                                          |
| Scaffold                       | `pnpm gen [capability\|action\|adr\|audit-contract\|workflow-job\|ask-doc]` — see §3                                                                                                                                                                                                              |
| UI / design                    | `#components2/ui/*` · `#lib/design-system` · `app/globals.css` tokens · rule `.cursor/rules/design-system.mdc`                                                                                                                                                                                     |
| Tests                          | `pnpm test:fast` (unit) · `pnpm test:e2e` (Playwright port 3001) · rule `.cursor/rules/testing.mdc`                                                                                                                                                                                               |
| Green CI                       | **`pnpm gate:help`** · **L0:** `pnpm gate -- <paths>` · **L2:** `pnpm gate:push` · **L3:** `pnpm gate:merge` · ADR-0033 · `.cursor/rules/targeted-verification.mdc`                                                                                                      |
| Neon / Vercel MCP              | Configure in `.cursor/mcp.json` · see §5 [MCP validation](#validating-with-neon-and-vercel-mcp)                                                                                                                                                                                                   |
| Ask docs                       | `app/(ask-docs)/[locale]/ask-docs/` · `content/ask-docs/` · **`pnpm ask-docs:preflight`** · **`pnpm ask-docs:check`** · **`pnpm ask-docs:validate-manifest`** · **`pnpm ask-docs:scaffold`** · `pnpm gen ask-doc` · ADR-0027 · `.agents/skills/adqs/` · rule `.cursor/rules/ask-docs-directory.mdc` |
| Ask docs AI chat (Public Lynx) | `app/api/chat/route.ts` · `#components2/ai/search` on `/{locale}/ask-docs` · `pnpm lint:public-lynx-contract` · rule `.cursor/rules/public-lynx.mdc` — **never** import `#features/lynx`                                                                                                           |

## Contents

1. [How to use this document](#1-how-to-use-this-document)
2. [Commands & quality gates](#2-commands--quality-gates)
3. [Toolchain](#3-toolchain)
4. [Enforcement & governance artifacts](#4-enforcement--governance-artifacts)
5. [ERP / full-stack stack](#5-erp--full-stack-stack)
6. [Directory contract](#6-directory-contract)
7. [Design system](#7-design-system)
8. [Decision protocol](#8-decision-protocol)
9. [Documentation refresh](#9-documentation-refresh)

---

## 1. How to use this document

**Single operating contract** — this file. Cursor rules mirror it; if they diverge, follow AGENTS.md and fix the rule.

**Always-on rules** (loaded for every task):

- `.cursor/rules/agents-md-mandatory.mdc` — preload + boundary checks
- `.cursor/rules/never-restore-deleted-components.mdc` — **never** recreate deleted files/components/routes/exports
- `.cursor/rules/nextjs-best-practices.mdc` — RSC, routing, caching, proxy
- `.cursor/rules/frontend-quality-contract.mdc` — React/TS quality, layout geometry

**Focused rules** (auto-loaded by glob):

- `i18n-directory.mdc` · `iam-directory.mdc` · `shell-directory.mdc`
- `ask-docs-directory.mdc` · `design-system.mdc` · `erp-primitives.mdc` · `planner-directory.mdc`
- `lynx-knowledge.mdc` · `public-lynx.mdc` · `simulation-directory.mdc` · `org-admin-directory.mdc` · `legal-docs-directory.mdc`
- `drizzle-migration-ledger.mdc` · `app-router-contracts.mdc` · `testing.mdc`
- `portal-directory.mdc` · `dev-directory.mdc` · `components2-directory.mdc` · `client-state-management.mdc` · `module-client-server-barrels.mdc` · `assets.mdc` · `figma-code-connect-workflow.mdc`

---

## 2. Commands & quality gates

**Gate ladder (ADR-0033)** — use the **lowest sufficient tier**. Do not run `lint:full`, `gate:push`, and `build` after every edit.

| Tier | When | Command | Typical cost (warm) |
| --- | --- | --- | --- |
| **L0** | After every edit / agent task | `pnpm gate -- <touched-paths…>` | ~15–45s |
| **L0** | Types only | `pnpm gate` or `pnpm typecheck` | ~10–30s |
| **L1** | Git commit | lint-staged (automatic) | staged files |
| **L2** | Before push / open PR | `pnpm gate:push` | ~2–5 min |
| **L3** | Pre-merge / App Router risk | `pnpm gate:merge` | ~5–10 min |
| **L4** | CI | GitHub Actions — do not replay locally unless debugging | parallel jobs |

### Common commands (high frequency — no `:full` suffix)

| Command | Purpose |
| --- | --- |
| **`pnpm gate -- <paths>`** | **Default close condition:** targeted ESLint + app `typecheck` |
| **`pnpm gate`** | App `typecheck` only (prints tip to pass paths) |
| **`pnpm gate:help`** | Print full gate ladder (onboarding / agent self-correction) |
| **`pnpm gate:dry-run -- <paths>`** | Print planned L0 commands without executing |
| **`pnpm typecheck`** | App TypeScript graph (`next typegen` + `tsc --noEmit`) |
| **`pnpm lint:path -- <paths>`** | Targeted ESLint only — never `eslint .` |
| **`pnpm typecheck:test`** | Test graph — add at L0 when `tests/` changed |
| **`pnpm typecheck:scripts`** | Scripts graph — add at L0 when `scripts/` changed |

### Full commands (low frequency — `:full` or `gate:*`)

| Command | Purpose |
| --- | --- |
| **`pnpm typecheck:full`** | App + test + scripts TypeScript graphs |
| **`pnpm lint:full`** / **`pnpm lint`** | Full Turbo lint stack (~18 governance tasks + repo ESLint) |
| **`pnpm gate:push`** | Pre-push: lint stack + all typechecks + knip + `test:ci` + format (alias: `pnpm verify:parallel`) |
| **`pnpm gate:merge`** | `gate:push` + production `next build` |
| **`pnpm verify`** / **`pnpm verify:ci`** | CI sequential variant (unchanged for workflows) |

> **Three-graph rule:** L0 uses **`pnpm typecheck`** (app only). Before push, **`gate:push`** runs all three graphs. Manually run **`pnpm typecheck:full`** only when debugging graph splits — not after every edit.

**Forbidden edit-loop habit:** `pnpm lint:full && pnpm gate:push && pnpm build && pnpm test:e2e` in one session — that replays CI locally (~8–15+ min).

| Command                               | Purpose                                                                                                                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                            | Dev server (Turbopack, port 3000)                                                                                                                                                                                    |
| `pnpm build` / `pnpm start`           | Production build / serve                                                                                                                                                                                             |
| `pnpm lint:full`                      | Turborepo: `lint:agent-contract → … → lint:ask-docs-* → …` (alias: **`pnpm lint`**) |
| `pnpm lint:eslint`                    | ESLint — zero warnings, unused disables reported                                                                                                                                                                     |
| `pnpm lint:drizzle-journal`           | `drizzle/*.sql` ↔ `_journal.json` parity                                                                                                                                                                             |
| `pnpm lint:route-error-files`         | `error.tsx` files ↔ approved operational shell allowlist (`scripts/check-route-error-files.mjs`)                                                                                                                     |
| `pnpm lint:public-lynx-contract`      | Public Lynx boundary — no `#features/lynx`, raw POST cap, shared transcript helpers (`scripts/check-public-lynx-contract.mjs`)                                                                                       |
| `pnpm lint:fixtures-parity`           | `tests/fixtures/*` ↔ `messages/en.json` + auth surfaces + seed script                                                                                                                                                |
| `pnpm ask-docs:check`                 | Ask-docs quality pipeline (Turbo meta task via `scripts/ask-docs-check-gate.mjs`) — `lint:ask-docs-links` + `lint:ask-docs-prose` + `lint:ask-docs-quality` (after editing `content/ask-docs/**`; in `pnpm verify*`) |
| `pnpm ask-docs:validate-manifest`     | Validate `.config/ask-docs-scaffold.manifest.json` (or `--manifest`) — no file writes                                                                                                                                    |
| `pnpm ask-docs:scaffold:dry-run`      | Dry-run fixture manifest (`tests/fixtures/ask-docs-scaffold-dry-run.manifest.json`) — proves scaffold wiring                                                                                                              |
| `pnpm ask-docs:preflight`             | Pre-PR docs workflow: `validate-manifest` + fixture `scaffold:dry-run` + `ask-docs:check`                                                                                                                                 |
| `pnpm ask-docs:scaffold`              | Batch-scaffold new MDX from `.config/ask-docs-scaffold.manifest.json` via `pnpm gen ask-doc` (idempotent; **not** part of `pnpm build`; supports `--dry-run`, `--json`)                                                   |
| `pnpm lint:ask-docs-links`            | `next-validate-link` — validates internal URLs in `content/ask-docs/**/*.mdx` (Fumadocs)                                                                                                                             |
| `pnpm lint:ask-docs-prose`            | `markdownlint-cli2` — narrow prose/style gate on `content/ask-docs/**/*.mdx` (config `.config/markdownlint-ask-docs.jsonc`)                                                                                          |
| `pnpm lint:ask-docs-quality`          | ADQS mechanical gate — stub strings, Related graph, stable frontmatter on `content/ask-docs/**/*.mdx` (`scripts/lint-ask-docs-quality.mjs`; ADR-0027)                                                                  |
| `pnpm audit:ask-docs-quality`         | ADQS corpus tier report A/B/C → `.artifacts/ask-docs-quality-audit.txt` (`scripts/audit-ask-docs-quality.mjs`; not in CI — PR review aid)                                                                               |
| `pnpm typecheck:full`                 | App + test + scripts graphs (`typecheck` + `typecheck:test` + `typecheck:scripts`) |
| `pnpm typecheck`                      | `tsc --noEmit` — **app graph only** |
| `pnpm typecheck:test`                 | `tsc -p tsconfig.test.json` — test graph |
| `pnpm typecheck:scripts`              | `tsc -p tsconfig.scripts.json` — scripts graph |
| `pnpm format` / `pnpm format:check`   | Prettier + Tailwind class sorting                                                                                                                                                                                    |
| `pnpm knip`                           | Dead-code verdict — run before push, not after each edit                                                                                                                                                             |
| `pnpm verify`                         | Full pre-merge graph (lint + typecheck + knip + test:ci + format:check)                                                                                                                                              |
| `pnpm verify:ci`                      | Same with `--concurrency=8 --output-logs=errors-only` for CI                                                                                                                                                         |
| `pnpm verify:parallel`                | Alias for `pnpm verify` (stable name)                                                                                                                                                                                |
| `pnpm test`                           | Vitest watch — `tests/unit/` (ADR-0008)                                                                                                                                                                              |
| `pnpm test:fast`                      | `vitest run --config .config/vitest.config.ts` (required — bare `vitest run` skips stubs)                                                                                                                            |
| `pnpm test:ci`                        | `vitest run --coverage` → `.artifacts/coverage/`                                                                                                                                                                     |
| `pnpm test:e2e`                       | `pnpm build` → Playwright on port 3001                                                                                                                                                                               |
| `pnpm env:sync`                       | `.env.config` → `.env.local`                                                                                                                                                                                         |
| `pnpm db:generate`                    | **Agent-owned (required).** After `lib/db/schema.ts` edits — additive only; **abort** if rename disambiguation prompts (no TTY). Commit SQL + meta with schema. **Never** ask human to run. **Never** from CI.       |
| `pnpm db:migrate:local`               | **Agent-owned (required).** After `lint:drizzle-journal` passes on local `.env.local`. **Never** ask human to run. **Never** from CI.                                                                                |
| `pnpm db:migrate:vercel`              | Out of scope for agents; do not ask human to run as a substitute for local discipline.                                                                                                                               |
| `pnpm db:push` / `pnpm db:push:local` | **Hard-fail stubs** — invoke `scripts/forbid-db-push.mjs`; drizzle-kit push removed (ADR-0032) |
| `pnpm simulate:replay`                | Replay scenario (`AFENDA_ENABLE_SIMULATION=1` required)                                                                                                                                                              |
| `pnpm simulate:clear`                 | Delete simulation rows for a run                                                                                                                                                                                     |

**L0 example (after editing HRM):**

```bash
pnpm gate -- lib/features/hrm/
# preview only:
pnpm gate:dry-run -- lib/features/hrm/
```

**Onboarding / reminder:**

```bash
pnpm gate:help
```

**L2 before push:**

```bash
pnpm gate:push
```

**Narrow lint gates (run instead of `lint:full` when only one concern changed):**

```bash
pnpm lint:drizzle-journal # after drizzle/*.sql changes
pnpm ask-docs:preflight # before docs PR: validate manifest + fixture dry-run + quality
pnpm ask-docs:check # after edits to content/ask-docs (links + prose + ADQS quality)
pnpm ask-docs:validate-manifest # after editing scaffold.manifest.json
pnpm ask-docs:scaffold -- --dry-run # preview production manifest without writes
pnpm ask-docs:scaffold # batch new pages from scaffold.manifest.json (on demand)
pnpm audit:ask-docs-quality # optional corpus tier report before PR
pnpm lint:fixtures-parity # after messages/en.json or fixture changes
pnpm lint:public-lynx-contract # after app/api/chat, components2/ai/search, lib/ask-docs/public-lynx*
```

> Rule: `.cursor/rules/targeted-verification.mdc` · decision: [ADR-0033](docs/decisions/0033-verify-gate-ladder-naming.md)

**Path aliases** (`package.json`): `#components2/*` · `#app-shell` · `#app-shell/client` · `#lib/*` · `#hooks/*` · `#features/*`

### Testing directory contract

| Directory          | Purpose                                                       | Key rules                                                             |
| ------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `tests/fixtures/`  | Canonical deterministic data (UUIDs, copy strings, factories) | No Playwright imports; parity enforced by `pnpm lint:fixtures-parity` |
| `tests/unit/`      | Vitest, Node-first                                            | `// @vitest-environment jsdom` only for DOM tests (`*.dom.test.tsx`)  |
| `tests/e2e/`       | Playwright `*.spec.ts`                                        | Explicit steps; tag `@smoke`; base URL `http://127.0.0.1:3001`        |
| `tests/e2e/utils/` | Browser helpers                                               | Import copy from `tests/fixtures`; no magic strings                   |

**Coverage (V8):** `lib/auth/**/*.shared.ts` + `lib/auth/callback-path.ts` → **≥ 95%**. Global ratcheted toward **80%**. Artifacts → `.artifacts/` only (gitignored).

**Transient output:** Vitest coverage → `.artifacts/coverage/` · Playwright JUnit → `.artifacts/playwright-junit.xml` · traces → `.artifacts/playwright/test-results/`

**Fixture typing rule — `as const satisfies <RowType>`:**

Mock DB-row and domain-type fixtures must use `as const satisfies <Type>` so any new required field on the real type fails at the fixture definition, not buried inside a `mockResolvedValue` call. Combine both operators: `as const` keeps literal types narrow for assertions (e.g. `state` stays `"preparing"`, not `string`); `satisfies` validates structural completeness against the real contract.

```ts
// ✅ — catches missing fields when PayrollPeriodRow gains a new required column
const PREPARING_PERIOD = {
  id: "period-2026-03",
  state: "preparing",
  // ...all fields...
} as const satisfies PayrollPeriodRow

// ❌ — new required field silently missing; error surfaces at mockResolvedValue instead
const PREPARING_PERIOD = { id: "period-2026-03", state: "preparing" } as const
```

Apply this pattern to **every fixture that represents a DB row or a typed engine input/output**.

---

## 3. Toolchain

| Tool        | Config                                              | Notes                                                                                              |
| ----------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Node        | `.node-version` / `.nvmrc` → **24**                 | `engines.node >=24.0.0`                                                                            |
| pnpm        | `pnpm@10.21.0` (lockfile v9)                        | Use Corepack or match CI pin                                                                       |
| TypeScript  | `tsconfig.json` — `target ES2022`, `lib ES2022+DOM` | `typedRoutes` via `.next/types` only; keep `.next/dev` excluded                                    |
| Drizzle Kit | `drizzle.config.ts` — `strict` + `verbose`          | `generate` emits SQL + updates `drizzle/meta/`; `migrate` applies journal only                     |
| Turborepo   | Single-package mode `turbo.json`                    | `pnpm lint/verify/verify:ci` → `node scripts/turbo-with-env.mjs` so `.env.local` applies `TURBO_*` |
| Generators  | `turbo/generators/` (`@turbo/gen`)                  | `pnpm gen` → `scripts/turbo-gen.mjs` → `turbo gen`                                                 |

**Turborepo generators** (`pnpm gen`):

| Generator        | What it scaffolds                                                                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `capability`     | Full ERP module slice (actions, data, components, schemas, index, contract)                                                                                                                                                |
| `action`         | Server Action in existing module — `pnpm gen action --module <slug> [--object] [--verb] [--tier B\|A\|S]`                                                                                                                  |
| `adr`            | Auto-incremented `docs/decisions/NNNN-*.md`                                                                                                                                                                                |
| `audit-contract` | `<module>.contract.ts` with `buildCrudSapAuditAction` strings                                                                                                                                                              |
| `workflow-job`   | Workflow DevKit durable run                                                                                                                                                                                                |
| `ask-doc`        | `content/ask-docs/<section>/<slug>.mdx` + optional `meta.json` append — `pnpm gen ask-doc --section <dir> --slug <kebab> --title "…" --description "…" --audience admin\|employee\|developer --status draft\|beta\|stable` |

Each generator runs `pnpm lint:agent-contract + pnpm lint:eslint --fix` on touched paths on day one. See ADR-0009.

### Drizzle migrations

See **[PRIORITY #1](#priority-1--drizzle-migrations-agents-own-local-humans-do-not)** and **[ADR-0032](docs/decisions/0032-drizzle-migration-agent-ownership.md)** first.

**Agent-owned (local). Human does not run generate, migrate, or DB reset.**

| Who                | Responsibility                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **IDE / agent**    | `lib/db/schema.ts` → `pnpm db:generate` → `pnpm lint:drizzle-journal` → `pnpm db:migrate:local` → commit atomically |
| **Human operator** | **Does not** run `db:generate`, `db:migrate:local`, `db:push*`, or nuke/reset scripts for agents. Do not ask.       |

**Agent workflow (local dev) — you run this, not the human:**

```bash
# 1. Edit lib/db/schema.ts only (no neon_auth.* DDL — query mirror: lib/db/schema-neon-auth.ts)
pnpm db:generate                    # abort if rename prompts — never spawn parallel 0005/0006-style duplicates
pnpm lint:drizzle-journal           # MUST pass (SQL count === journal count)
pnpm db:migrate:local               # fixes local "relation does not exist"
# 2. Commit schema + drizzle/*.sql + drizzle/meta/* in one change
```

**Ledger discipline (non-negotiable)**

- One schema change → one `db:generate` → one new journal entry. Commit before the next generate.
- If `lint:drizzle-journal` fails, **stop** — fix by reverting mistaken SQL/meta or regenerating from a clean schema diff; do **not** bulk-delete files and do **not** hand-patch `prevId` in snapshots.
- If `db:generate` reports snapshot collision, you broke the chain — fix without asking human to reset DB.

**Forbidden for agents**

| Command / action                                                           | Why                                                  |
| -------------------------------------------------------------------------- | ---------------------------------------------------- |
| Asking human to run `db:generate` / `db:migrate:local`                     | Agent-owned per PRIORITY #1                          |
| Asking human to nuke or reset Neon                                         | Human will not help; you must not destroy the ledger |
| `pnpm db:push` / `pnpm db:push:local`                                      | Hard-fail stubs — bypasses journal; caused drift class |
| `node scripts/drizzle-migrate-logged.mjs`                                  | Use `pnpm db:migrate:local` only                     |
| `node scripts/nuke-db-public.mjs`                                          | Destructive — never                                  |
| Hand-edit `drizzle/*.sql`, `drizzle/meta/_journal.json`, `*_snapshot.json` | Corrupts drizzle-kit baseline                        |
| Bulk orphan SQL cleanup without journal parity                             | Caused 21-vs-7 incident                              |
| `drizzle-kit` CLI except via `pnpm db:generate`                            | Bypass                                               |
| Neon MCP / SQL DDL for app tables                                          | Not in journal                                       |

**Doctrine**

- `lib/db/schema.ts` = schema source of truth (no `neon_auth.*` DDL).
- `pnpm db:generate` → SQL + `drizzle/meta/`; `pnpm db:migrate:local` applies **only** journal SQL.
- Never delete `drizzle/meta/` while migrations exist.

---

## 4. Enforcement & governance artifacts

All boundaries are enforced mechanically by scripts + ESLint, not this markdown alone.

### 4.1 Contract scripts

| Script                                   | Enforces                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/check-agent-contract.mjs`       | Required files; `alwaysApply: true` on mandatory rules; ESLint restricts `#features/*/*`; no dump dirs; module root shape (`index.ts` required; allowed entries only); no cross-module deep imports |
| `scripts/check-design-contract.mjs`      | `@theme inline var(--)` ↔ `:root`/`.dark`; forbidden radii/palette/shadow; material adoption drift                                                                                                  |
| `scripts/check-drizzle-journal.mjs`      | `drizzle/*.sql` ↔ `_journal.json` tag + order parity                                                                                                                                                |
| `scripts/check-route-error-files.mjs`    | `error.tsx` files ↔ operational shell allowlist; enforces `"use client"`, no server-only imports, no module-level boundaries                                                                        |
| `scripts/check-public-lynx-contract.mjs` | Public Lynx stack — no ERP Lynx import, no IAM on `/api/chat`, `readPublicLynxChatRequestBody`, Vitest `--config` in `package.json` scripts                                                         |
| `pnpm lint:fixtures-parity`              | `tests/fixtures/*` ↔ `messages/en.json`, auth surfaces, seed script, dev sign-in panel, org audit CSV                                                                                               |
| `turbo.json`                             | Cacheable verify task graph; `inputs` include `turbo.json` itself so cache-graph edits rerun the contract                                                                                           |

### 4.2 Required files (CI gate)

```
AGENTS.md
.cursor/rules/agents-md-mandatory.mdc
.cursor/rules/never-restore-deleted-components.mdc
.cursor/rules/design-system.mdc
.cursor/rules/i18n-directory.mdc
.cursor/rules/lynx-knowledge.mdc
.cursor/rules/erp-primitives.mdc
.cursor/rules/planner-directory.mdc
.cursor/rules/simulation-directory.mdc
.cursor/rules/shell-directory.mdc
.cursor/rules/portal-directory.mdc
.cursor/rules/module-client-server-barrels.mdc
docs/decisions/0030-module-client-server-barrel-boundary.md
docs/decisions/0032-drizzle-migration-agent-ownership.md
.cursor/rules/drizzle-migration-ledger.mdc
eslint.config.mjs
scripts/check-design-contract.mjs
scripts/check-route-error-files.mjs
tests/unit/fixtures-i18n-parity.test.ts
turbo.json
turbo/generators/config.ts
```

### 4.3 Gate schedule

| Moment                           | Gate                                                                                                                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preinstall`                     | `check-agent-contract.mjs`                                                                                                                                                                                                    |
| `pnpm lint`                      | `lint:agent-contract → lint:drizzle-journal → lint:route-error-files → lint:public-lynx-contract → lint:fixtures-parity → lint:eslint → lint:design-contract → lint:ask-docs-links → lint:ask-docs-prose` (Turborepo, cached) |
| `pnpm verify` / `pnpm verify:ci` | Full graph — lint + typecheck + knip + test:ci + format:check                                                                                                                                                                 |
| CI (`.github/workflows/ci.yml`)  | `check-agent-contract` → `pnpm install` → cache `.turbo` → `pnpm verify:ci` → cache `.next/cache` → `pnpm build` → Playwright                                                                                                 |

**CI Remote Cache** (optional): set `TURBO_TOKEN` + `TURBO_TEAM` (`jacks-projects-7b3cfe94`) + `TURBO_REMOTE_CACHE_SIGNATURE_KEY` as GitHub secrets.

### 4.4 Fail-fast triggers

- Missing / weakened files in §4.2
- Forbidden dump dirs or unapproved top-level dirs/files
- Cross-module deep feature imports
- Design-contract violations (geometry, palette, material drift)
- `drizzle/*.sql` ↔ `_journal.json` drift
- Fixture / catalog drift
- `turbo.json` missing

---

## 5. ERP / full-stack stack

### DB

- **Neon Postgres** + Drizzle — schema `lib/db/schema.ts`, client `lib/db/index.ts` (`@neondatabase/serverless` HTTP, `fetchOptions.cache: 'no-store'`).
- **Pool vs direct:** pooled `DATABASE_URL` at runtime; `DATABASE_URL_UNPOOLED` for migrations (drizzle.config.ts uses it automatically).
- **pgvector:** `CREATE EXTENSION vector` in `drizzle/0004_knowledge_chunk_vector.sql`; `knowledge_chunk` table with HNSW index; embeddings via `#features/knowledge` + Vercel AI Gateway (`openai/text-embedding-3-small`, 1536 dims).

### Auth / IAM

- **Neon Auth** (Better Auth–compatible) + organization plugin (multi-tenant `activeOrganizationId`).
- **Server door:** `#lib/auth` (`server-only`) — `auth`, `requireRecentAuthStepUp`, **all session/org guards** (`requireOrgSession`, `getOrgTenantContext`, `requireSignedInSession`, `requireGlobalAdminSession`, …).
- **Browser door:** `#lib/auth-client` ([`lib/auth-client.ts`](lib/auth-client.ts)) — Neon Auth client only; never import `#lib/auth` from Client Components.
- **Retired:** `#lib/tenant` and `lib/tenant.ts` — use `#lib/auth` only (`lib/auth/tenant-session.server.ts`).
- **HTTP:** `/api/auth/[...path]`. Neon webhooks: `app/api/integrations/neon-auth-webhooks/`.
- **Session guards** (use in layouts): `requireSignedInSession()` for `/console` and legacy `/account` (redirects to org profile); `requireOrgSession()` + `getOrgTenantContext()` for ERP; `requireGlobalAdminSession()` for `/platform`.
- **IDOR:** `organizationId` is authoritative **only** from `requireOrgSession` / `getOrgTenantContext` / `getOrgSessionFromRequest` — never trust it from `FormData`, JSON, or query strings.
- **Step-up:** `requireRecentAuthStepUp` with `disableCookieCache: true` → `AUTH_STATUS.SESSION_EXPIRED` or `AUTH_STATUS.STEP_UP_REQUIRED`.
- **Invites:** `ORG_INVITE_MAX_PER_HOUR` (default 30); Upstash Redis ratelimit when env set, otherwise `iam_audit_event` rolling counts.
- **Files:** Vercel Blob (`app/api/upload/blob/`). S3-compatible reserved for archive/long-lived evidence.
- **Authority split (ERP hard cutover):**
  - `neon_auth.member.role` is compatibility-only membership metadata (`member/admin/owner`) and is **not** ERP business authorization.
  - Tenant governance authority lives in `lib/features/erp-rbac/` via `tenant_authority` overlays: `tenant_owner`, `tenant_key_admin`, `tenant_support_admin`.
  - ERP operational authority lives in `erp_role` + `erp_role_member` + `erp_role_permission` and is enforced through `requireErpPermission(...)`.
  - Platform recovery authority stays separate (`platform_operator`, `platform_support`, `platform_security`) and never grants ERP business access by itself.
- **Rule:** `.cursor/rules/iam-directory.mdc`

### Tenant routing

- **Canonical Workbench URLs:** `/{locale}/o/{orgSlug}/apps/{module}` (ADR-0029; legacy `/dashboard/*` 308 → `/apps/*`)
- **Canonical portal URLs:** `/{locale}/p/{portalSlug}/...` for org-owned external/constrained portals.
- **Path builders:** `organizationAppsPath`, `organizationNexusPath`, `organizationHrmPath`, `organizationAdminPath`, `platformPath`; portal helpers live in `lib/portal/` — use these, never hard-code paths.
- **revalidatePath:** `toLocaleOrgAppsRevalidatePattern("/contacts")` for ERP; `toLocaleRoutePattern("/path")` for static locale routes. Never revalidate a single locale.
- **Slug params:** validate org slugs with `normalizeOrgSlugParam` before DB resolution; portal slugs must use `normalizePortalSlugParam` from `lib/portal/`.
- **Client shell** imports `#lib/org-apps-module-paths` (not feature barrels) to avoid pulling `server-only` into the client bundle.

### Portal routing

- **Route root:** `/{locale}/p/{portalSlug}` is the canonical portal boundary for employee, supplier, customer, investor, and future org-owned external-facing surfaces.
- **Authority:** `/p` resolves organization context through `portalSlug`; it does not rely on active Workbench org switching.
- **Guard model:** portal layouts use portal context guards from `lib/portal/`; audience-specific guards enforce employee/supplier/customer/investor subject access.
- **Business logic:** portal routes compose feature modules only through public doors; ERP/domain logic remains in `lib/features/<module>/`.
- **Shell:** `/p` uses `PortalShell` from `components2/portal-shell/`; it must never mount `AppShell`.
- **Rule:** `.cursor/rules/portal-directory.mdc`

### Locale-first routing

- `localePrefix: "always"` — all public URLs include `/{locale}/`.
- **Edge entry:** `proxy.ts` runs `createIntlMiddleware` then presence-only cookie check for `/o`, `/p`, `/account`, `/platform`, legacy `/operator`, `/accept-invitation`, `/console`. Matcher excludes `api`, `_next`, `_vercel`, `.well-known`, static assets.
- **Never emit bare `/sign-in`, `/o`, or `/p` from server** — use `toLocalePath(locale, path)`.
- **Post-login:** `/{locale}/console` is the loading bay (single-org → redirect to nexus immediately).
- **`callbackUrl`** must be locale-prefixed + validated via `resolvePostAuthCallbackUrl`.
- **Refactor gate (local only):** `AFENDA_I18N_SINGLE_LOCALE` + `NEXT_PUBLIC_AFENDA_I18N_SINGLE_LOCALE` narrow `APP_LOCALES` to `en` for faster builds — see [ADR-0028](docs/decisions/0028-single-locale-refactor-gate.md). **Required before deploy:** unset both, `pnpm env:sync`, backfill non-English catalogs, full verify. Never set in CI/Vercel production.
- **Rule:** `.cursor/rules/i18n-directory.mdc`

### Nexus runtime (org root)

```
Nexus owns the OS.  Surfaces execute work.  Materials are governed.
```

- **Org root:** `/{locale}/o/{orgSlug}` → `/{locale}/o/{orgSlug}/nexus`.
- **Shell mounts at:** `app/[locale]/o/[orgSlug]/layout.tsx` (not dashboard layout) — ensures utility bar / dock / command persist across surfaces.
- **`components2/app-shell/`** owns all post-login shell chrome. **`components2/` Nexus field** (Lynx summon overlays) — not repo-root `components/`. No `components/dashboard/` (hard-deleted).
- **NexusSnapshot:** one server-built snapshot per request — no per-widget fetching.
- **Forbidden vocabulary:** dashboard (as org root noun), widget, cockpit, home (as org root noun), AI mode, notification center.
- **Shell is final (ADR-0005):** do not reintroduce legacy shell wrappers.

### App shell (post-login chrome)

- Import **`AppShell`** / **`AppSubLayout`** from **`#app-shell`**; client islands from **`#app-shell/client`**.
- Org/console layouts compose **`utilityBar`** via `buildAppShellOrgUtilityBarSlots` / `buildAppShellConsoleUtilityBarSlots` (server-only composers under `components2/app-shell/compose/`).
- Nested rail surfaces (org admin, HRM, member profile, operator) use **`AppSubLayout`** + **`AppShellPrimaryLeftRail*`** inside the parent org `AppShell`.
- Rail slot kernel: `appshell-primary-left-rail.schema.ts`. Builders are pure mappers. Cross-cutting structural changes → `ts-morph` codemod under `scripts/refactors/`.
- Portal chrome is separate: `/p/{portalSlug}` uses `PortalShell` from `components2/portal-shell/`, never `AppShell`.

### Working Memory Rail

- Module: `lib/features/rail-memory/` — pins, saved views, recent visits per `(org, user, workbench)`.
- Audit: `iam.workbench.pin.{create|delete|reorder}` · `iam.workbench.view.{create|update|delete}`.
- Recents: `recordRecentVisit` via `after()` in RSC pages (not Server Actions). Rate-limited 30s per resource.
- Limits: `RAIL_PIN_LIMIT_PER_WORKBENCH = 30`, `RAIL_VIEW_LIMIT_PER_WORKBENCH = 30`, `RAIL_RECENT_SURFACE_LIMIT = 5`.

### Operational primitives (Past · Now · Next / CRUD-SAP / 7W1H)

```
Orbit               — forward operational execution substrate (product)
Past · Now · Next   — composition primitive (developers)
CRUD-SAP + 7W1H     — internal operating grammar + audit shape (architecture)
```

- **`lib/erp/` is primitive-only** — no DB schema imports, no feature imports, no UI, no module-specific behavior.
- **Temporal spine:** `lib/erp/temporal-spine.shared.ts` — `TemporalPast`, `TemporalNow`, `TemporalNext`, `asTemporal`, `asTemporalFromColumns`.
- **CRUD-SAP verbs** (audit/ranker only — never user labels): `create | resolve | update | deprecate | search | audit | predict`. Use `buildCrudSapAuditAction` for new strings; legacy verbs via `buildErpAuditAction`.
- **7W1H:** `lib/erp/audit-7w1h.shared.ts` (shape + `describeAuditEvent7W1H`) + `lib/erp/audit-7w1h.server.ts` (`writeAuditEvent7W1H`).

**Composition recipe (Server Action):**

```ts
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { writeAuditEvent7W1H } from "#lib/erp/audit-7w1h.server"

await writeAuditEvent7W1H({
  event: {
    action: buildCrudSapAuditAction({
      area: "erp",
      module: "planner",
      object: "item",
      verb: "resolve",
    }),
  },
  iam: {
    actorUserId,
    organizationId,
    resourceType: "planner_item",
    resourceId,
    metadata: {},
  },
  existingCache: row.audit7w1h,
  cacheUpdater: async (trimmed) => {
    /* tx.update(…).set({ audit7w1h: trimmed }) */
  },
})
```

### Orbit / Planner

- Public product: **Orbit**. Internal domain: **Planner** (`lib/features/planner/`).
- Core primitives: `PlannerSignal`, `PlannerItem`. ADR-0006 + sub-ADRs 0007a-d.
- **Retired:** OneThing and iThink — do not reintroduce. Historical audit strings in `lib/erp/historical-erp-execution-audit-actions.shared.ts` (read-only).
- Rule: `.cursor/rules/planner-directory.mdc`

### Lynx / Knowledge

- **Lynx** (`lib/features/lynx/`): ERP machine layer for Truth Retrieval, Operating Briefs, NL→SQL.
- **Knowledge** (`lib/features/knowledge/`): pgvector substrate. Lynx composes it via `#features/knowledge` barrel.
- Client islands import `#features/lynx/client` (not the main barrel) to avoid pulling `server-only`.
- Streaming HTTP: `app/api/erp/lynx/*`. Audit strings: `lynx.contract.ts` (`erp.lynx.*`).
- Rule: `.cursor/rules/lynx-knowledge.mdc`

### HRM

- Module: `lib/features/hrm/` — `HRM_CAPABILITIES` registry drives routes, nav, audit prefixes, sanitizer.
- Barrels: `#features/hrm` (RSC + registry) · `#features/hrm/client` (path helpers + Server Actions for forms) · `#features/hrm/server` (payroll rule-pack).
- Routes: `/apps/hrm/employees`, `/apps/hrm/employees/[employeeId]`, `/apps/hrm/[segment]`.
- **ESLint rule `afenda/hrm-pii-audit-metadata`**: blocks PII keys inside `writeIamAuditEvent*` calls within `lib/features/hrm/`.
- Narrative: `docs/_draft/hrm-draft-v2.md`.
- **Authorization doctrine:** `minimumOrgRole` is retired as business authorization. HRM page entry, nav visibility, data loads, and mutations must resolve from ERP RBAC permission keys, not Better Auth org roles.

### ERP RBAC

- Module: `lib/features/erp-rbac/` — tenant-governance overlays + ERP operational permission model.
- Public guards:
  - `requireTenantAuthority(...)`
  - `requireTenantOwnerOrOperator()`
  - `requireErpPermission(...)`
  - `listEffectiveErpPermissionsForUser(...)`
- **Function vocabulary:** `create | read | update | delete | search | audit | predict`
- **Derived verbs:** `submit | approve | reject | lock | finalize | post -> update`; `archive | remove -> delete`; `detail | download | export -> read` unless the route is explicitly audit-grade.
- **Separation of duties (v1):** for the same `(organization, module, object)`, one user may not effectively hold more than one of `create`, `update`, or `delete`. `read`, `search`, `audit`, and `predict` may combine freely.
- **Cutover rule:** ERP modules must not use `canActInOrganization(..., "admin")` as final business authorization.

### Org admin (`/o/{orgSlug}/admin`)

- Module: `lib/features/org-admin/` — `ORG_ADMIN_CAPABILITIES` drives sidebar, path builder, sanitizer, audit prefixes.
- URL: `/{locale}/o/{orgSlug}/admin/{section}`.
- Cache: `toLocaleOrgAdminRevalidatePattern` for Server Actions.
- Event namespaces: `iam.* | org.* | erp.* | governance.* | integration.* | workflow.* | system.*`
- Rule: `.cursor/rules/org-admin-directory.mdc`

**Org admin capability registry:**
| Capability | Segment | Audit prefix |
|---|---|---|
| `identity` | `members` | `org.member.*` |
| `governance` | `audit` | `org.governance.*` |
| `integrations` | `integrations` | `org.integration.*` |
| `organization` | `settings` | `org.profile.*` |
| `operations` | _(reserved)_ | `org.operations.*` |

### Platform admin (`/platform`)

- Module: `lib/features/platform-admin/` — `PLATFORM_ADMIN_CAPABILITIES` drives nav + sanitizer.
- Routes: `app/(main)/[locale]/platform/*` — `AppShell` + `AppSubLayout`; not under `/o/{orgSlug}` (ADR-0031).
- Guards: `requireGlobalAdminSession()` + `requireRecentAuthStepUp` in layout.
- Path: `platformPath(segment?)`; revalidate via `toLocalePlatformRevalidatePattern`.
- Capability registry:

| Capability      | Segment         | Audit prefix         |
| --------------- | --------------- | -------------------- |
| `directory`     | `users`         | `iam.user.*`         |
| `organizations` | `organizations` | `iam.organization.*` |
| `audit`         | `audit`         | `iam.audit.*`        |
| `system`        | `system`        | `iam.system.*`       |

### Operational execution (Workflow DevKit)

- **Role:** durable execution only (retries, batches, resumption) — not ERP business rules.
- **Authority:** Server Actions remain the mutation boundary. `#features/execution` holds the cross-cutting contract + `enqueueOrgImportJobWorkflowRun`.
- **Triggers:** Server Actions → `app/api/*` → cron/webhooks — not client-driven graphs.
- **Tenancy:** `organizationId` only from trusted server context after `requireOrgSession`.
- **UX ban:** workflow builder, AI flows, automation studio — prefer runs, pipelines, execution.

### Operational simulation

- **Role:** deterministic what-if runs persisting real `iam_audit_event` rows stamped `audit_origin = simulation`.
- **Module:** `lib/features/simulation/` — `#features/simulation` / `#features/simulation/server`.
- **Gate:** `AFENDA_ENABLE_SIMULATION=1`.
- **Rule:** `.cursor/rules/simulation-directory.mdc`

### Observability

| Layer                          | What it covers                                                         |
| ------------------------------ | ---------------------------------------------------------------------- |
| Pino (`lib/logger.server.ts`)  | Structured evidence log (Node only). `LOG_PRETTY=1` for dev.           |
| OpenTelemetry (`@vercel/otel`) | Execution map — custom spans via `lib/observability/otel-span.server.ts` (Node only) |
| Sentry (`@sentry/nextjs`)      | Incident inbox (grouping, source maps)                                 |
| `iam_audit_event`              | Business truth ledger — do not replace with technical logs             |
| Vercel Runtime Logs            | Operational backstop                                                   |

- **Expected failures** (validation, permission denial) → return values, not `logger.error`.
- **Caught abnormal failures** on Node → `logUnexpectedServerError` from `#lib/logger.server`.
- **Edge/client** `error.tsx` / `global-error.tsx` must not import `#lib/logger.server`.

### Neon + Vercel setup checklist

1. `vercel link --scope jacks-projects-7b3cfe94`
2. Provision Neon via Vercel Marketplace → get pooled `DATABASE_URL`.
3. Set `DATABASE_URL_UNPOOLED` (direct endpoint) for migrations.
4. Local dev: agents run `pnpm db:migrate:local` after schema changes (see PRIORITY #1). Do not ask the operator to migrate or reset.
5. Enable **Neon Auth** in Neon Console for each branch (creates `neon_auth` schema).
6. Add `AI_GATEWAY_API_KEY` for local dev (+ optional `EMBEDDING_MODEL`). On Vercel, `VERCEL_OIDC_TOKEN` is auto-injected — no static key required.
7. Redeploy.

### Validating with Neon and Vercel MCP

Configure MCP servers in `.cursor/mcp.json` (`neon`, `vercel`). Never put secrets in docs.

**Neon MCP:** `describe_project` · `describe_branch` · `compare_database_schema` (check for `vector` ext, missing tables) · `run_sql` (read-only checks).

**Vercel MCP:** `get_project` (confirm `afenda-vercel` metadata) · `search_vercel_documentation` (pooled vs direct Postgres, Neon Marketplace).

### IAM audit policy

**Doctrine:** audit authority changes, durable business state changes, irreversible decisions. No DB write → no `iam_audit_event` row.

**Tiers:**

- **Tier S** — Security/tenancy (org existence, ownership, destructive org actions)
- **Tier A** — Irreversible/compliance-sensitive (posting, finalizing, reversing)
- **Tier B** — Standard durable CRUD (`requireOrgSession` default)

**Mutation gate matrix:**
| Mutation type | Gate | Tier |
|---|---|---|
| Read-only / validation | `requireOrgSession` if private route | No audit |
| Standard CRUD | `requireOrgSession` | B |
| Admin master data | `requireOrgSession` + `canActInOrganization(..., "admin")` | B |
| Posting / reversing | `requireOrgSession` + `canActInOrganization(..., "admin")` | A |
| Destructive org action | `requireOrgSession` + `canActInOrganization(..., "owner")` | S/A |

**Audit action naming:**

```
erp.<module>.<object>.<verb>   →  erp.contact.record.create
org.<object>.<verb>            →  org.member.invite
iam.<area>.<verb>              →  iam.session.org_switch
```

**Canonical audit strings** live in each module's `<module>.contract.ts`. Reference files:

- `lib/features/lynx/lynx.contract.ts` (`erp.lynx.*`)
- `lib/features/execution/execution.contract.ts` (`erp.execution.*`)
- `lib/features/rail-memory/constants.ts` (`iam.workbench.*`)

**Server Action checklist:**

1. Perform a real DB mutation (stubs → no audit).
2. Classify Tier A/B/S, apply minimum gate.
3. `requireOrgSession()` (or stricter) at action start.
4. `writeIamAuditEvent` **only after successful commit**; include `actorSessionId`, `organizationId`, `resourceType`, `resourceId`; no secrets/bulk PII in `metadata`.

**Historical-only strings** (no runtime emitter): `erp.onething.*`, `erp.ithink.*` — renderable via `lib/erp/historical-erp-execution-audit-actions.shared.ts` (read-only).

---

## 6. Directory contract

### Golden rule

```
app/          → routes only
lib/features/ → ERP modules
lib/auth/     → IAM control plane
lib/db/       → database schema + client
lib/erp/      → shared primitives only (temporal-spine, crud-sap, audit-7w1h, money, pagination)
lib/portal/   → portal control plane only (slug, path, resolver, guard, audience contracts)
```

Afenda is **stricter than default Next.js colocation** ([project structure](https://nextjs.org/docs/app/getting-started/project-structure)): `app/` stays routing-only; shared code lives under named `lib/` subtrees or `components2/`, not loose files at `lib/` root.

### 6.1 `lib/` root allowlist (exhaustive)

Only these files may exist directly under `lib/` (`lib/*.ts` / `lib/*.tsx`). **No other loose files at `lib/` root.**

| File | Import door | Layer |
|------|-------------|-------|
| `auth-client.ts` | `#lib/auth-client` | Client (`"use client"`) — browser IAM |
| `org-apps-module-paths.ts` | `#lib/org-apps-module-paths` | Shared — client-safe ERP app path builders |
| `design-system.ts` | `#lib/design-system` | Shared — token/Zod contract |
| `logger.server.ts` | `#lib/logger.server` | Server (Node) — structured logs |
| `session-cache.ts` | `#lib/session-cache` | Server — `React.cache()` session dedupe |
| `site.ts` | `#lib/site` | Shared — origin + brand constants |
| `utils.ts` | `#lib/utils` | Shared — shadcn `cn()` only (`components.json` alias) |

```txt
FORBIDDEN without updating this table in the same PR:
  lib/<anything-else>.ts
  lib/<anything-else>.shared.ts
  “temporary” root files “until we nest later”
```

**Carve-out:** `lib/utils.ts` is the only allowed `utils` *filename* at repo root. The banned category `utils/` still applies to new dump folders and feature innards.

**Lib-nesting:** only §6.1 files may live at `lib/` root — nest new cross-cutting code under §6.2 subtrees; see [`.cursor/plans/lib-root-and-agents-anti-drift.plan.md`](.cursor/plans/lib-root-and-agents-anti-drift.plan.md). Session guards: `lib/auth/tenant-session.server.ts` via `#lib/auth`. IAM mail: `lib/auth/auth-mail.server.ts` (deep import only; not barrel-exported).

### 6.2 Required `lib/` subtrees

| Directory | Owns | Public door |
|-----------|------|-------------|
| `lib/auth/` | IAM control plane, session guards (`tenant-session.server.ts`), org slug, auth mail | `#lib/auth` (server barrel); `#lib/auth/*.shared` for edge/client |
| `lib/db/` | Drizzle schema + client | `#lib/db` |
| `lib/erp/` | Primitives only (temporal, CRUD-SAP, audit-7w1h, route envelope) | `#lib/erp/*` — no feature logic |
| `lib/portal/` | Portal slug, guards, paths | `#lib/portal` |
| `lib/features/<module>/` | ERP domain | `#features/<module>` only |
| `lib/i18n/` | Locale paths, searchParams helpers, org forward-path sanitization | `#lib/i18n/*` |
| `lib/ask-docs/` | Fumadocs loader, public Lynx helpers, LLM export | `#lib/ask-docs/*` |
| `lib/ai/` | Shared AI helpers (non–ERP Lynx) | `#lib/ai/*` |
| `lib/observability/` | OTEL spans, request-error telemetry | `#lib/observability/*` |
| `lib/api/` | Route handler JSON helpers | `#lib/api/*` |
| `lib/browser/` | Client-only cookie/preference helpers | `#lib/browser/*` |

**Retired paths (do not recreate):**

- `#lib/tenant` → `#lib/auth` only
- `#lib/dashboard-org-path.shared`, `#lib/dashboard-org-redirect.server`, `#lib/app-search-params.shared`, `#lib/app-metadata-surface.shared` → `#lib/i18n/*` (`private-surface-robots.shared.ts` for metadata robots)
- `#lib/hrm-dashboard.shared`, `#lib/planner-dashboard.shared` → `#features/hrm/hrm-apps-path.shared`, `#features/planner/planner-orbit-path.shared` (not the module barrel — avoids `constants` ↔ `org-apps-module-paths` cycle)
- `#lib/route-handler-json.shared` → `#lib/api/route-handler-json.shared`
- `#lib/route-envelope.shared` → `#lib/erp/route-envelope.shared`
- `#lib/otel-span.server`, `#lib/request-error-context.shared`, `#lib/request-error-telemetry.server` → `#lib/observability/*`
- `#lib/client-cookie.shared` → `#lib/browser/client-cookie.shared`
- `#lib/next-app-error-page-props.shared` → `#components2/route-error/error-page-props.shared`
- Root `lib/ask-docs-*.ts` duplicates → `lib/ask-docs/*`
- Repo-root `components/` → `components2/` only

### 6.3 Anti-drift doctrine

```txt
Authority order:  AGENTS.md  >  .cursor/rules/*.mdc  >  comments  >  old ADRs

When you move or delete a file:
  1. Update every import in the same PR (no re-export shims at old paths).
  2. Update AGENTS.md if the public door or §6.1 allowlist changed.
  3. Update the matching .cursor/rules/*.mdc if it names the old path.
  4. Run targeted eslint on touched paths + pnpm typecheck.

When AGENTS.md and disk disagree:
  Trust disk for builds; fix AGENTS.md before declaring the task done.

Forbidden drift patterns:
  - New lib/*.ts at root not in §6.1
  - Parallel import doors (#lib/tenant vs #lib/auth)
  - Documenting repo-root components/ paths (hard-deleted)
  - “Phase N will nest this” with no issue link after Phase N shipped
  - Compatibility redirects/aliases for deleted routes or moved modules
```

### App vs source (frontend boundary)

```txt
app/ — URL segments, layout.tsx authority (Tier A/B), thin page.tsx wiring,
      loading.tsx / error.tsx / not-found.tsx, approved app/api/* only.
      Forbidden: ERP queries, domain rules, feature UI bodies, Zod schemas,
      Server Action implementations, and barrel re-exports of feature modules.

lib/features/<module>/ — business logic, RSC feature pages, Server Actions,
      schemas, contracts. Public doors: #features/<module>, #features/<module>/client,
      #features/<module>/server.

components2/ — shell chrome (app-shell, portal-shell, providers, stores),
      metadata renderers, auth/console/marketing surfaces. Import via #app-shell,
      #app-shell/client, #components2/* — not from app/.

i18n/ + messages/ — locale routing and catalogs only.

content/ask-docs/ — MDX authoring only (routes in app/(ask-docs)/).

Cross-module imports: #features/<module> only — never deep paths into lib/features/.../data/.
```

### Public docs / ask-docs (Fumadocs MDX)

- **`/{locale}/ask-docs`** — canonical public locale-first documentation (Fumadocs MDX), **no auth cookie gate** — naming parallel to **`/{locale}/legal-docs`**.
- **`content/ask-docs/`** — MDX authoring root; **`source.config.ts`** + **`.source/`** (generated by `fumadocs-mdx` / `next build`) feed `lib/ask-docs/source.ts`.

**Three pipelines** (keep separate — do not run `pnpm gen ask-doc` on every `build`):

| Pipeline | Command | When |
| --- | --- | --- |
| **Compile** | `pnpm dev` / `pnpm build` | Fumadocs MDX → `.source/` → `askDocsSource` → `app/(ask-docs)/…/[[...slug]]` (automatic; no `gen` required for existing MDX) |
| **Quality** | `pnpm ask-docs:check` | After editing `content/ask-docs/**`; also in `pnpm verify*` and path-filtered CI [`.github/workflows/ask-docs.yml`](.github/workflows/ask-docs.yml) |
| **Validate** | `pnpm ask-docs:validate-manifest` | Parse/check `scaffold.manifest.json`; warns on missing `meta.json` sidebar entries |
| **Scaffold** | `pnpm ask-docs:scaffold` or `pnpm gen ask-doc …` | New stub pages only; `pnpm ask-docs:scaffold:dry-run` uses committed fixture manifest |

Do **not** commit `.source/` — it is regenerated by Next/Fumadocs. Do **not** add scaffold or `gen ask-doc` to `prebuild` by default.

**Surface inventory** (split into a dedicated repo/package when content volume warrants it):

| File / dir                                                | Role                                                                                                                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `source.config.ts`                                        | `defineDocs({ dir: "content/ask-docs", async: true })` + extended `pageSchema`; `applyMdxPreset` per-collection MDX (`remarkNpm`, `remarkSteps`, Twoslash); plugins `lastModified`, `jsonSchema({ insert: true })` |
| `lib/ask-docs/source.ts`                                  | `askDocsSource` — single Fumadocs `loader()` with `defineI18n`; `getPage(slug, locale)` / `getPageTree(locale)`                                                                                                    |
| `lib/ask-docs/path.shared.ts`                             | `askDocsPath(locale, slug?)` — locale-prefixed `/ask-docs` paths                                                                                                                                                   |
| `lib/ask-docs/og.shared.ts`                               | `getAskDocsOgImagePath(locale, slugs)` — `/og/ask-docs/{locale}/…/image.png`                                                                                                                                       |
| `app/(ask-docs)/[locale]/ask-docs/_lib/markdown-path.ts`  | `getAskDocsProcessedMarkdownPath(slug)` — `/llms.mdx/ask-docs/…` (Copy / View as Markdown)                                                                                                                         |
| `lib/site.ts`                                             | `getAskDocsGithubUrl(pagePath)` — from `NEXT_PUBLIC_ASK_DOCS_GITHUB_URL`                                                                                                                                           |
| `app/(ask-docs)/[locale]/ask-docs/layout.tsx`             | `DocsLayout` + scoped `RootProvider`; Orama `/api/ask-docs-search`; **Ask Lynx** (`#components2/ai/search`)                                                                                                        |
| `app/api/chat/route.ts`                                   | Public Lynx streaming chat — Vercel AI SDK + flexsearch over ask-docs (no org session)                                                                                                                             |
| `components2/ai/search.tsx`                               | Ask Lynx client islands — PNG round trigger (`public/icons/lynx/`), suggested prompts, ChatGPT-style bubbles, scroll anchor                                                                                        |
| `lib/ask-docs/lynx-brand.shared.ts`                       | Lynx PNG path constants (`Lynx-transfrom-1/2/3.png`)                                                                                                                                                               |
| `components2/markdown.tsx`                                | Streaming markdown renderer for Lynx chat messages                                                                                                                                                                 |
| `app/(ask-docs)/[locale]/ask-docs/[[...slug]]/page.tsx`   | Page render + `generateStaticParams` + `generateMetadata` (OG + Twitter cards); feedback + optional **Links on this page**                                                                                         |
| `app/(ask-docs)/[locale]/ask-docs/[[...slug]]/actions.ts` | `submitAskDocsFeedback` Server Action (logs via `rootLogger`)                                                                                                                                                      |
| `app/og/ask-docs/[locale]/[...slug]/route.tsx`            | `next/og` `ImageResponse` for OG images; `revalidate = false` + `generateStaticParams`                                                                                                                             |
| `app/api/ask-docs-search/route.ts`                        | Fumadocs Orama full-text search (`createFromSource` on `askDocsSource`); `?locale=` query; `localeMap` for en/zh-CN/vi/ms                                                                                          |
| `app/api/ask-docs-search/route.ts`                        | Same for the ask-docs `RootProvider` search widget                                                                                                                                                                 |
| `app/llms.txt/route.ts`                                   | LLM-friendly plain-text index of all docs pages                                                                                                                                                                    |
| `app/llms-full.txt/route.ts`                              | Full MDX-processed content for all pages                                                                                                                                                                           |
| `app/llms.mdx/ask-docs/[[...slug]]/route.ts`              | Per-page markdown GET endpoint; `proxy.ts` + `next.config` rewrite `/{locale}/ask-docs/*.md` here                                                                                                                  |
| `app/(ask-docs)/[locale]/ask-docs/_components/mdx.tsx`    | `useMDXComponents` — vanilla Fumadocs shelf; `components2/ask-docs-mermaid.tsx` for Mermaid                                                                                                                        |
| `.config/markdownlint-ask-docs.jsonc`                     | markdownlint-cli2 config for `lint:ask-docs-prose`                                                                                                                                                                 |
| `scripts/lint-ask-docs-prose.mjs`                         | Invokes markdownlint-cli2 on `content/ask-docs/**/*.mdx`                                                                                                                                                           |
| `scripts/lint-ask-docs-quality.mjs`                       | ADQS mechanical gate (stubs, Related, frontmatter) — see ADR-0027                                                                                                                                                  |
| `scripts/audit-ask-docs-quality.mjs`                      | Heuristic tier report → `.artifacts/ask-docs-quality-audit.txt`                                                                                                                                                    |
| `.agents/skills/adqs/SKILL.md`                            | Embedded agent workflow — composes documentation-audit + technical-writing + ADQS rubric                                                                                                                           |
| `turbo/generators/config.ts`                              | Registers `ask-doc` generator (`pnpm gen ask-doc`)                                                                                                                                                                 |
| `turbo/generators/templates/ask-doc/page.mdx.hbs`         | `pnpm gen ask-doc` MDX skeleton                                                                                                                                                                                    |
| `components2/feedback/client.tsx`                         | `<Feedback>` client island (thumbs up/down + optional comment)                                                                                                                                                     |
| `components2/feedback/schema.ts`                          | Zod schema for feedback payload                                                                                                                                                                                    |
| `content/ask-docs/`                                       | MDX pages + `meta.json` files (sidebar order)                                                                                                                                                                      |
| `scripts/validate-ask-docs-links.ts`                      | `next-validate-link` — internal URL validation for MDX content                                                                                                                                                     |
| `scripts/ask-docs-check-gate.mjs`                       | User entry for `pnpm ask-docs:check` — invokes Turbo `ask-docs:check` (lint deps + noop leaf when `TURBO_HASH` is set)                                                                                           |
| `scripts/ask-docs-scaffold-from-manifest.mjs`           | `pnpm ask-docs:scaffold` — batch `gen ask-doc` from manifest (`--dry-run`, `--validate-only`, `--json`, `--manifest`)                                                                                            |
| `scripts/lib/ask-docs-scaffold-manifest.shared.mjs`     | Shared manifest validation/planning (unit-tested)                                                                                                                                                                  |
| `.config/ask-docs-scaffold.manifest.json`               | Planned pages for batch scaffold (JSON array; empty `[]` when unused) — **not** under `content/ask-docs/` (Fumadocs would treat it as `meta.json`)                                                                  |
| `tests/fixtures/ask-docs-scaffold-dry-run.manifest.json`| Fixture for `pnpm ask-docs:scaffold:dry-run` (pipeline smoke; slug must not exist on disk)                                                                                                                         |

**Split trigger:** when `content/ask-docs/` exceeds ~50 MDX files or requires a CMS, extract as a standalone Fumadocs Next.js app and serve under a subdomain (`docs.afenda.com`). Until then, keep it co-located.

**Deferred integrations** (add only when a named requirement exists):

- **`fumadocs-openapi`** — enable only when a committed `openapi.yaml` (or `openapi.json`) lives in-repo **or** CI has a stable pinned URL secret the generator can fetch; then add a `scripts/generate-openapi-docs.mts` (or similar) → committed MDX under `content/ask-docs/` + `lint:ask-docs-links` in CI.
- `@fumadocs/story` — component playground in MDX (needs `.story.tsx` files)
- Takumi (`@takumi-rs/image-response`) — Rust OG renderer (not worth extra native dep for static images)

See `.cursor/rules/ask-docs-directory.mdc` for authoring, ADQS workflow, and import rules. Canonical decision: **ADR-0027**.

### Portal control plane

- `lib/portal/` owns portal slug validation, path helpers, audience registry, context types, resolver contracts, guard contracts, and portal-specific revalidation helpers.
- `lib/portal/` must not own ERP business logic, database-heavy feature queries, Server Actions, or UI chrome.
- `components2/portal-shell/` owns portal chrome only and must not fetch domain data or perform authorization.
- `app/[locale]/p/[portalSlug]/layout.tsx` owns portal context resolution before rendering `PortalShell`.
- `/p/[portalSlug]` runtime files must use the Next.js async params contract (`params: Promise<{ portalSlug: string }>` and `await params`).
- `route.ts` is forbidden under `app/[locale]/p/**`; use approved `app/api/*` route-handler families for portal HTTP contracts.
- See ADR-0020 and `.cursor/rules/portal-directory.mdc`.

### Module vocabulary (allowed root entries)

```
actions/    → "use server" Server Actions (validation, tenant guard, revalidation)
data/       → server-only DB access (no React/UI/client imports)
lib/features/<module>/components/ → ERP module UI only (not repo-root components/)
schemas/    → Zod validation contracts
constants.ts · types.ts · index.ts · server.ts (optional) · client.ts (optional)
*.contract.ts
```

**`index.ts` is required.** Do not add categories not in this list without updating AGENTS.md first.

**Barrels (ADR-0030):**

- `index.ts` — **server door** for RSC pages, layouts, `*.server.ts`, Server Actions. Evaluating this module runs **all** re-exports — never import from `"use client"` / `*.client.tsx` when the index re-exports server RSC sections or `./data/`.
- `client.ts` — **client door** for `"use client"` modules: client components, Zod schemas, pure `.shared.ts` helpers, and Server Actions invoked from client forms.
- `server.ts` — `server-only` re-exports for layouts/shells that need server-only query graphs.

**Client import rule:** If a file has `"use client"` or is named `*.client.tsx`, use `#features/<module>/client` (or same-module relative / allowed deep `schemas/` paths). Using `#features/<module>` pulls the entire `index.ts` graph into the browser bundle and can surface `next/headers` / `#lib/auth` build failures.

### Import boundary (enforced by ESLint + `check-agent-contract.mjs`)

```ts
// ✅ Server (RSC page, layout, *.server.ts)
import { GovernedPatternCListSection } from "#features/governed-surface"
import { listContactsForOrganization } from "#features/contacts"

// ✅ Client (*.client.tsx, "use client")
import { GovernedTrailingActionSlot, isListSurfaceTrailingActionRenderable } from "#features/governed-surface/client"
import { archiveContactAction } from "#features/contacts/client"

// ✅ Server-only graph
import { listOrgImportJobs } from "#features/org-admin/server"

// ❌ Client file importing server barrel (entire index.ts graph loads)
import { isListSurfaceTrailingActionRenderable } from "#features/governed-surface"

// ❌ Deep cross-module internals
import { listContactsForOrganization } from "#features/contacts/data/contacts.queries"
```

### File naming convention (`components2/`)

**Rule:** `.cursor/rules/components2-directory.mdc` (glob: `components2/**`).

Read the filename left → right: **folder = context**, then **entity** (and optional **aspect**), then **layer suffix**. Length varies; every segment is a concrete kebab-case noun — no `utils`, `helpers`, `manager`, `common`, `misc`, etc.

```txt
[feature-prefix-]<entity>[-<aspect>].<layer>.ts(x)
```

| Layer suffix | Role | Example |
| --- | --- | --- |
| `.store.ts` | Zustand (`stores/` only) | `utility-bar.store.ts` → `useUtilityBarStore` |
| `.provider.client.tsx` | React provider | `theme-provider.client.tsx` |
| `.client.tsx` | Client component | `appshell-utility-bar-messenger.client.tsx` |
| `.tsx` | RSC entry or shared composition | `appshell.tsx`, `appshell-sub-layout-surface.tsx` |
| `.schema.ts` | Zod contracts | `appshell-primary-left-rail.schema.ts` |
| `.shared.ts` | Cross-boundary types | `appshell-props.shared.ts` |

**Stores (reference practice):** one file per state domain under `components2/stores/` — `<domain>.store.ts`, barrel in `stores/index.ts`. Examples: `app-shell.store.ts`, `lane-memory.store.ts`, `operational-scope.store.ts`. Do not nest stores under `app-shell/`.

**App-shell regions:** subfolder = place (`top-utils-bar/`, `left-rail-bar/`); file = `appshell-<entity>[-<aspect>].<layer>`.

Shell wiring table: `shell-directory.mdc`.

### Banned categories

`services` · `managers` · `helpers` · `utils` · `repositories` · `controllers` · `hooks` · `adapters` · `processors` · `engines` · `builders` · `factories`

### API governance

**Default:** ERP dashboard mutations use **Server Actions**, not REST.
**Portals:** `/p` mutations use Server Actions. Do not create `route.ts` under `app/[locale]/p/**`; portal HTTP contracts belong in the approved `app/api/*` families and must authorize independently.

**Allowed Route Handler families:**

```
app/api/auth/*
app/api/cron/*
app/api/upload/*
app/api/webhooks/*
app/api/integrations/*
app/api/erp/<module>/*   ← mobile/external/streaming/webhook contracts only
app/api/chat/*           ← public docs AI chat ("Public Lynx"); see .cursor/rules/public-lynx.mdc
```

### Canonical directory shape

```
app/
  [locale]/
    (auth)/**     ← sign-in, sign-up, verify-email, forgot/reset password, accept-invitation
    account/[[...path]]/  ← legacy redirect to org profile
    console/      ← post-login loading bay
    operator/     ← platform admin surface
    p/[portalSlug]/ ← org-owned portal boundary (PortalShell; no AppShell)
    o/[orgSlug]/
      layout.tsx  ← AppShell mounts here
      page.tsx    ← redirect to nexus
      nexus/
      profile/    ← member IAM (identity, security)
      admin/      ← org admin workbench
      apps/
        contacts/ · hrm/ · orbit/ · lynx/ · …
  api/auth/ · cron/ · upload/ · webhooks/ · integrations/ · erp/<module>/

components2/
  portal-shell/   ← portal chrome only

lib/
  auth-client.ts · org-apps-module-paths.ts
  design-system.ts · logger.server.ts · session-cache.ts · site.ts · utils.ts  ← §6.1 allowlist only
  auth/           ← IAM control plane (index.ts = public door)
  db/             ← schema.ts + index.ts
  erp/            ← shared primitives only
  portal/         ← portal control plane (slug, path, resolver, guard, audience contracts)
  i18n/           ← locale paths, org forward-path sanitization
  ask-docs/       ← Fumadocs + public Lynx helpers
  ai/             ← shared AI helpers (non–ERP Lynx)
  features/
    contacts/     ← ceiling reference module
    hrm/          ← workforce module
    erp-rbac/     ← tenant governance overlays + ERP permission system
    lynx/         ← machine layer
    knowledge/    ← pgvector substrate
    nexus/        ← org-root data layer
    planner/      ← Orbit execution substrate (extended vocabulary — see ADR-0006)
    execution/    ← cross-cutting durable execution contract
    simulation/   ← scenario replay
    org-admin/    ← org control plane
    platform-admin/ ← global admin
    rail-memory/  ← working memory rail
    governed-surface/ ← shared post-login page chrome metadata

tests/
  fixtures/   ← deterministic data
  unit/       ← Vitest
  e2e/        ← Playwright
    utils/
```

### Module exception: Planner / Orbit

`lib/features/planner/` has an extended vocabulary approved by ADR-0006. See `.cursor/rules/planner-directory.mdc`.

### Module exception: governed-surface

May contain only `components/` (under `lib/features/governed-surface/`), `schemas/`, `index.ts`, `client.ts`. Must not fetch domain data or own business logic. See ADR-0011.

### Metadata rollout playbook (ADR-0026)

**Platform maturity:** [`docs/architecture/metadata-maturity-score.md`](docs/architecture/metadata-maturity-score.md) (target **≥ 90** before mass ERP default).

**Section composition (Pattern C blocks):** [`docs/architecture/governed-section-composition-score.md`](docs/architecture/governed-section-composition-score.md) (target **≥ 9.4/10** per section).

| Pattern | Use when | Import / primitive |
| --- | --- | --- |
| **A** | Page chrome + bespoke forms | `GovernedSurface`, `ModulePageHeader`, `GovernedSection` from `#features/governed-surface` |
| **B** | Serializable list/KPI via full renderer tree | `GovernedComponentRenderer` from `#components2/metadata` + manual section `Card` when header actions needed (contacts ceiling) |
| **C** | Pattern B list + trailing forms/actions | `GovernedPatternCListSection` from `#features/governed-surface`; trailing UI: `GovernedTrailingActionSlot` from `#features/governed-surface/client` |
| **K** | Kanban workflow boards | `GovernedKanbanFooterSection` / `GovernedKanbanDragSection` + `GovernedKanbanFooterBoard` or `GovernedKanbanDragBoard` from `#features/governed-surface/client`; read-only via `GovernedComponentRenderer` (`governed:kanban-board`) |

**Recipe (Pattern B):**

1. Add `lib/features/<module>/data/*-surface-builders.server.ts` (`server-only`) returning `ListSurfaceRendererConfigurationInput`.
2. Page: `Promise.all` for session, translations, queries; `resolveGovernedErpPermissionAllowed` when `requiresErpPermission` is set (`#features/governed-surface/server`).
3. `Card` + optional `CardAction` → `GovernedComponentRenderer` with `surfaceKey`, `type: "governed:list-surface"`, `configuration`.
4. Forbidden list: `GovernedEmpty` `variant: "forbidden"` — not bare `<p>`.

**Recipe (Pattern C):**

1. Builder in `data/*-list-surface.server.ts`: `requiresErpPermission`, `surface.empty`, per-row `trailingAction` when actions are gated.
2. Thin RSC section → `GovernedPatternCListSection` (`listConfiguration`, `surfaceKey`, `title`, `description`).
3. `trailingColumn.render` + `GovernedTrailingActionSlot` + domain form component.
4. `loadError` for query failures; `layout="embedded"` when parent `Card` already owns the header.
5. `parentAccessAllowed` / `resolveConfiguredPermission` when the page already resolved ERP read (see claim inboxes).

**Recipe (Pattern K):** builder → `GovernedKanbanFooterSection` + client bridge by `interactionMode` (`footer-actions` | `drag-reorder`); do not render footer/drag boards through `KanbanBoardRenderer` alone. Reference: `recruitment-pipeline-kanban-section.tsx`.

**Pattern C checklist:**

- [ ] Builder is `server-only`; no parse/render in `app/`
- [ ] `requiresErpPermission` on configuration when the list is ERP-gated
- [ ] `surfaceKey` stable and unique (e.g. `hrm:onboarding:contracts`)
- [ ] Row `trailingAction` metadata when trailing controls exist
- [ ] No early empty `return` with a duplicate hand-rolled `Card`
- [ ] No `parseListSurfaceRendererConfiguration` + manual `Card` fork in the feature section
- [ ] `data-testid="governed-list-section:{surfaceKey}"` on production routes (smoke via Playwright)
- [ ] Invalid config uses module or `Dashboard.GovernedSurface.invalidConfig*` copy — not empty-state titles

**New renderer:**

```bash
node scripts/wire-governed-renderer.mjs <slug>
pnpm lint:components2-renderers && pnpm lint:renderer-contracts
pnpm lint:renderer-container-queries && pnpm lint:renderer-skeleton-parity && pnpm lint:renderer-fixtures
```

**Forbidden:** deep `list-surface-table` imports from feature modules; Pattern C empty fork via `GovernedComponentRenderer` in feature code.

**Dev galleries:** `/{locale}/dev/metadata-renderer-gallery` (renderers) · `/{locale}/dev/pattern-c-section-gallery` (Pattern C section states).

---

## 7. Design system

| Layer               | Location                             | Notes                                                                   |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| Semantic tokens     | `app/globals.css` (`:root`, `.dark`) | OKLCH palette, elevation, motion, density                               |
| Tailwind bridge     | `app/globals.css` (`@theme inline`)  | Every `var(--)` must resolve to `:root`/`.dark`                         |
| Primitive contracts | `lib/design-system.ts`               | Preferred `ui.*` aliases, allowlisted radii, Zod parsers                |
| Primitives shelf    | `components2/ui/**`                  | Import only via `#components2/ui/*` — never filesystem-relative         |
| Dev overlays        | `components2/dev/`                 | Gated (`NODE_ENV === "development"`); use existing token utilities only |
| Policy              | `docs/design-system/governance.md`   | Code leads; Figma mirrors code                                          |

**Rules:**

- `radix-ui` / `@radix-ui/*` / `@base-ui/react` confined to `components2/ui`.
- On filled primary/secondary controls: use `bg-primary-hover` / `bg-secondary-hover`, not `hover:bg-primary/…`.
- Dev overlays: **do not** patch `app/globals.css` for dev-only styles.
- Rule: `.cursor/rules/design-system.mdc`

---

## 8. Decision protocol

When speed and architecture safety conflict:

1. Keep boundaries intact.
2. Choose the smallest compliant implementation.
3. Document the trade-off in the PR/commit message.
4. Do not introduce speculative abstractions.
5. New architectural category → update **AGENTS.md first**, then implement.

---

## 9. Documentation refresh

When Next.js or platform behavior is uncertain, prefer **Context7** (`/vercel/next.js`) or **Vercel MCP** `search_vercel_documentation` over training data.

For Drizzle: Context7 `/websites/orm_drizzle_team`.

For next-intl: Context7 `/amannn/next-intl`.
