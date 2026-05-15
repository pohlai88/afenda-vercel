# Agent guide — afenda-vercel

**Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Neon Postgres · Drizzle ORM

**Read before every task:** §4 (enforcement gates), §5 (ERP + routing), §6 (directory contract).

---

## Non-negotiable boundaries

| Boundary             | Rule                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Module public door   | `lib/features/<module>/index.ts` only — no cross-module deep imports                                                        |
| ERP business logic   | `lib/features/<module>/` only — never in `app/`, `proxy.ts`, or `lib/erp/`                                                  |
| `app/` layer         | Routing, composition, page wiring only                                                                                      |
| Mutations            | Server Actions by default; Route Handlers only for `auth`, `cron`, `upload`, `webhooks`, `integrations`, `api/erp/<module>` |
| `proxy.ts`           | Session/locale gate only — no DB, no business logic                                                                         |
| Portal control plane | `lib/portal/` only — portal slug, path, resolver, guard, and audience contracts; no ERP business logic                      |
| Banned categories    | `services`, `utils`, `helpers`, `repositories`, `controllers` — forbidden unless AGENTS.md updated first                    |
| Root cleanliness     | No dump dirs at repo or module root                                                                                         |
| UI primitives        | Import only via `#components/ui/*` — never filesystem-relative. `radix-ui`/`@base-ui/react` stay inside `components/ui`     |
| Design tokens        | `@theme inline var(--)` must resolve to `:root`/`.dark` definitions                                                         |
| Change governance    | New architectural category → update **this file first**, then implement                                                     |

---

## Quickstart

| Goal                   | Where                                                                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jump to topic          | [Contents](#contents)                                                                                                                                                                                                                                                                             |
| Workbench shell        | **Legacy:** `#components/workbench/*` (`AppShell`/`AppSubLayout` = `WorkbenchShell`/`WorkbenchSubLayout`). **New (canonical):** `#app-shell` (`components2/app-shell/`); shell providers `components2/providers/`; shell Zustand `components2/stores/`. Rule: `.cursor/rules/shell-directory.mdc` |
| Nexus (org root)       | `app/[locale]/o/[orgSlug]/nexus/` · `#features/nexus` · redirected from `/{locale}/o/{orgSlug}`. See §5                                                                                                                                                                                           |
| ERP feature            | `lib/features/<module>/` · `#features/<module>` only · no deep imports · see §6                                                                                                                                                                                                                   |
| Orbit / Planner        | `lib/features/planner/` · product name Orbit · see ADR-0006 · rule `.cursor/rules/planner-directory.mdc`                                                                                                                                                                                          |
| HRM                    | `lib/features/hrm/` · `HRM_CAPABILITIES` registry · `#features/hrm/client` for forms · `#features/hrm/server` for rule-pack                                                                                                                                                                       |
| ERP RBAC               | `lib/features/erp-rbac/` · tenant governance overlays + ERP permission guards · `#features/erp-rbac/server` for server-only guards/queries                                                                                                                                                        |
| Lynx / Knowledge       | `lib/features/lynx/` · `#features/lynx/client` for client islands · rule `.cursor/rules/lynx-knowledge.mdc`                                                                                                                                                                                       |
| Org admin              | `lib/features/org-admin/` · `ORG_ADMIN_CAPABILITIES` registry · `/o/{orgSlug}/admin/*` · rule `.cursor/rules/org-admin-directory.mdc`                                                                                                                                                             |
| Portals                | `app/[locale]/p/[portalSlug]/` · `lib/portal/` · `components2/portal-shell/` · rule `.cursor/rules/portal-directory.mdc`                                                                                                                                                                          |
| Platform admin         | `lib/features/platform-admin/` · `PLATFORM_ADMIN_CAPABILITIES` · `/operator/*`                                                                                                                                                                                                                    |
| Operational primitives | `#lib/erp/temporal-spine.shared` · `#lib/erp/crud-sap.shared` · `#lib/erp/audit-7w1h.{shared,server}`                                                                                                                                                                                             |
| Workflow DevKit        | `#features/execution` contract · `enqueueOrgImportJobWorkflowRun` · [useworkflow.dev](https://useworkflow.dev/)                                                                                                                                                                                   |
| Operational simulation | `#features/simulation` · `AFENDA_ENABLE_SIMULATION=1` · rule `.cursor/rules/simulation-directory.mdc`                                                                                                                                                                                             |
| Working Memory Rail    | `#features/rail-memory` · `WorkbenchRail` slots · `iam.workbench.*` audits                                                                                                                                                                                                                        |
| i18n                   | `#i18n/navigation` (client) · `toLocalePath` (server) · `localePrefix: "always"` · rule `.cursor/rules/i18n-directory.mdc`                                                                                                                                                                        |
| DB / Drizzle           | `lib/db/schema.ts` · `pnpm db:migrate:local` · `pnpm db:generate` in TTY · rule `.cursor/rules/drizzle-migration-ledger.mdc`                                                                                                                                                                      |
| Auth / IAM             | `#lib/auth` (server-only) · `#lib/auth-client` (browser) · rule `.cursor/rules/iam-directory.mdc`                                                                                                                                                                                                 |
| Scaffold               | `pnpm gen [capability\|action\|adr\|audit-contract\|workflow-job]` — see §3                                                                                                                                                                                                                       |
| UI / design            | `#components/ui/*` · `#lib/design-system` · `app/globals.css` tokens · rule `.cursor/rules/design-system.mdc`                                                                                                                                                                                     |
| Tests                  | `pnpm test:fast` (unit) · `pnpm test:e2e` (Playwright port 3001) · rule `.cursor/rules/testing.mdc`                                                                                                                                                                                               |
| Green CI               | **Targeted (concurrent agents):** `pnpm exec eslint --max-warnings=0 <path> && pnpm typecheck` · **Full (solo):** `pnpm typecheck && pnpm lint` · **Pre-push:** `pnpm verify:parallel` · Rule: `.cursor/rules/targeted-verification.mdc`                                                          |
| Neon / Vercel MCP      | Configure in `.cursor/mcp.json` · see §5 [MCP validation](#validating-with-neon-and-vercel-mcp)                                                                                                                                                                                                   |

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
- `.cursor/rules/nextjs-best-practices.mdc` — RSC, routing, caching, proxy
- `.cursor/rules/frontend-quality-contract.mdc` — React/TS quality, layout geometry

**Focused rules** (auto-loaded by glob):

- `i18n-directory.mdc` · `iam-directory.mdc` · `shell-directory.mdc`
- `design-system.mdc` · `erp-primitives.mdc` · `planner-directory.mdc`
- `lynx-knowledge.mdc` · `simulation-directory.mdc` · `org-admin-directory.mdc`
- `drizzle-migration-ledger.mdc` · `app-router-contracts.mdc` · `testing.mdc`
- `portal-directory.mdc` · `dev-directory.mdc` · `assets.mdc` · `figma-code-connect-workflow.mdc`

---

## 2. Commands & quality gates

| Command                             | Purpose                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                          | Dev server (Turbopack, port 3000)                                                                                   |
| `pnpm build` / `pnpm start`         | Production build / serve                                                                                            |
| `pnpm lint`                         | Turborepo: `lint:agent-contract → lint:drizzle-journal → lint:fixtures-parity → lint:eslint → lint:design-contract` |
| `pnpm lint:eslint`                  | ESLint — zero warnings, unused disables reported                                                                    |
| `pnpm lint:drizzle-journal`         | `drizzle/*.sql` ↔ `_journal.json` parity                                                                            |
| `pnpm lint:fixtures-parity`         | `tests/fixtures/*` ↔ `messages/en.json` + auth surfaces + seed script                                               |
| `pnpm lint:a11y`                    | `eslint-plugin-jsx-a11y` — optional gate until folded into `lint`                                                   |
| `pnpm typecheck`                    | `tsc --noEmit` (app only — tests/scripts have split tsconfigs)                                                      |
| `pnpm typecheck:test`               | `tsc -p tsconfig.test.json`                                                                                         |
| `pnpm typecheck:scripts`            | `tsc -p tsconfig.scripts.json`                                                                                      |
| `pnpm format` / `pnpm format:check` | Prettier + Tailwind class sorting                                                                                   |
| `pnpm knip`                         | Dead-code verdict — run before push, not after each edit                                                            |
| `pnpm verify`                       | Full pre-merge graph (lint + typecheck + knip + test:ci + format:check)                                             |
| `pnpm verify:ci`                    | Same with `--concurrency=8 --output-logs=errors-only` for CI                                                        |
| `pnpm verify:parallel`              | Alias for `pnpm verify` (stable name)                                                                               |
| `pnpm test`                         | Vitest watch — `tests/unit/` (ADR-0008)                                                                             |
| `pnpm test:fast`                    | `vitest run` without coverage                                                                                       |
| `pnpm test:ci`                      | `vitest run --coverage` → `.artifacts/coverage/`                                                                    |
| `pnpm test:e2e`                     | `pnpm build` → Playwright on port 3001                                                                              |
| `pnpm env:sync`                     | `.env.config` → `.env.local`                                                                                        |
| `pnpm db:migrate:local`             | Drizzle migrate with `.env.local`, then `lint:fixtures-parity`                                                      |
| `pnpm db:migrate:vercel`            | Same after `pnpm env:pull-vercel`                                                                                   |
| `pnpm db:generate`                  | `drizzle-kit generate` — **requires interactive TTY**                                                               |
| `pnpm db:push:local`                | Schema push for throwaway branches only                                                                             |
| `pnpm simulate:replay`              | Replay scenario (`AFENDA_ENABLE_SIMULATION=1` required)                                                             |
| `pnpm simulate:clear`               | Delete simulation rows for a run                                                                                    |

**Post-task gate — targeted (use when other agents may be running):**

```bash
# Lint only the files/dirs you touched — avoids full workspace scan
pnpm exec eslint --max-warnings=0 <path1> [path2 ...]

# Typecheck — incremental (~10s warm); safe to run concurrently
pnpm typecheck
```

**Post-task gate — full workspace (only agent running, or design-token / i18n changes):**

```bash
pnpm typecheck && pnpm lint
# Both must exit 0.
```

**Narrow lint gates (run instead of full `pnpm lint` when only one concern changed):**

```bash
pnpm lint:drizzle-journal   # after drizzle/*.sql changes
pnpm lint:fixtures-parity   # after messages/en.json or fixture changes
```

**Pre-push gate:**

```bash
pnpm verify:parallel
```

> Rule: `.cursor/rules/targeted-verification.mdc` — full decision table for concurrent-agent scenarios.

**Path aliases** (`package.json`): `#components/*` · `#lib/*` · `#hooks/*` · `#features/*`

### Testing directory contract

| Directory          | Purpose                                                       | Key rules                                                             |
| ------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| `tests/fixtures/`  | Canonical deterministic data (UUIDs, copy strings, factories) | No Playwright imports; parity enforced by `pnpm lint:fixtures-parity` |
| `tests/unit/`      | Vitest, Node-first                                            | `// @vitest-environment jsdom` only for DOM tests (`*.dom.test.tsx`)  |
| `tests/e2e/`       | Playwright `*.spec.ts`                                        | Explicit steps; tag `@smoke`; base URL `http://127.0.0.1:3001`        |
| `tests/e2e/utils/` | Browser helpers                                               | Import copy from `tests/fixtures`; no magic strings                   |

**Coverage (V8):** `lib/auth/**/*.shared.ts` + `lib/auth/callback-path.ts` → **≥ 95%**. Global ratcheted toward **80%**. Artifacts → `.artifacts/` only (gitignored).

**Transient output:** Vitest coverage → `.artifacts/coverage/` · Playwright JUnit → `.artifacts/playwright-junit.xml` · traces → `.artifacts/playwright/test-results/`

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

| Generator        | What it scaffolds                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `capability`     | Full ERP module slice (actions, data, components, schemas, index, contract)                               |
| `action`         | Server Action in existing module — `pnpm gen action --module <slug> [--object] [--verb] [--tier B\|A\|S]` |
| `adr`            | Auto-incremented `docs/decisions/NNNN-*.md`                                                               |
| `audit-contract` | `<module>.contract.ts` with `buildCrudSapAuditAction` strings                                             |
| `workflow-job`   | Workflow DevKit durable run                                                                               |

Each generator runs `pnpm lint:agent-contract + pnpm lint:eslint --fix` on touched paths on day one. See ADR-0009.

### Drizzle migrations

- `lib/db/schema.ts` = schema source of truth (no `neon_auth.*` DDL — use `lib/db/schema-neon-auth.ts` for query-only mirrors).
- `drizzle-kit generate` → SQL + `drizzle/meta/` (run in a **real TTY** for ambiguous renames).
- `drizzle-kit migrate` applies **only** SQL registered in `_journal.json` — orphan `.sql` files are silently skipped.
- `pnpm db:push*` = throwaway local branches only.
- Never delete `drizzle/meta/` while legacy migrations exist — Drizzle will baseline the whole schema.

---

## 4. Enforcement & governance artifacts

All boundaries are enforced mechanically by scripts + ESLint, not this markdown alone.

### 4.1 Contract scripts

| Script                              | Enforces                                                                                                                                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/check-agent-contract.mjs`  | Required files; `alwaysApply: true` on mandatory rules; ESLint restricts `#features/*/*`; no dump dirs; module root shape (`index.ts` required; allowed entries only); no cross-module deep imports |
| `scripts/check-design-contract.mjs` | `@theme inline var(--)` ↔ `:root`/`.dark`; forbidden radii/palette/shadow; material adoption drift                                                                                                  |
| `scripts/check-drizzle-journal.mjs` | `drizzle/*.sql` ↔ `_journal.json` tag + order parity                                                                                                                                                |
| `pnpm lint:fixtures-parity`         | `tests/fixtures/*` ↔ `messages/en.json`, auth surfaces, seed script, dev sign-in panel, org audit CSV                                                                                               |
| `turbo.json`                        | Cacheable verify task graph; `inputs` include `turbo.json` itself so cache-graph edits rerun the contract                                                                                           |

### 4.2 Required files (CI gate)

```
AGENTS.md
.cursor/rules/agents-md-mandatory.mdc
.cursor/rules/design-system.mdc
.cursor/rules/i18n-directory.mdc
.cursor/rules/lynx-knowledge.mdc
.cursor/rules/erp-primitives.mdc
.cursor/rules/planner-directory.mdc
.cursor/rules/simulation-directory.mdc
.cursor/rules/shell-directory.mdc
.cursor/rules/portal-directory.mdc
eslint.config.mjs
scripts/check-design-contract.mjs
tests/unit/fixtures-i18n-parity.test.ts
turbo.json
turbo/generators/config.ts
```

### 4.3 Gate schedule

| Moment                           | Gate                                                                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `preinstall`                     | `check-agent-contract.mjs`                                                                                                    |
| `pnpm lint`                      | `lint:agent-contract → lint:drizzle-journal → lint:fixtures-parity → lint:eslint → lint:design-contract` (Turborepo, cached)  |
| `pnpm verify` / `pnpm verify:ci` | Full graph — lint + typecheck + knip + test:ci + format:check                                                                 |
| CI (`.github/workflows/ci.yml`)  | `check-agent-contract` → `pnpm install` → cache `.turbo` → `pnpm verify:ci` → cache `.next/cache` → `pnpm build` → Playwright |

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
- **pgvector:** `CREATE EXTENSION vector` in `drizzle/0004_knowledge_chunk_vector.sql`; `knowledge_chunk` table with HNSW index; embeddings via `#features/knowledge` + `@ai-sdk/openai` (`text-embedding-3-small`, 1536 dims).

### Auth / IAM

- **Neon Auth** (Better Auth–compatible) + organization plugin (multi-tenant `activeOrganizationId`).
- **Server door:** `#lib/auth` (`server-only`) — `auth`, `requireRecentAuthStepUp`, all guards.
- **Browser door:** `#lib/auth-client` (`lib/auth-client.ts`).
- **HTTP:** `/api/auth/[...path]`. Neon webhooks: `app/api/integrations/neon-auth-webhooks/`.
- **Session guards** (use in layouts): `requireSignedInSession()` for `/console`/`/account`; `requireOrgSession()` + `getOrgTenantContext()` for ERP; `requireGlobalAdminSession()` for `/operator`.
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

- **Canonical Workbench URLs:** `/{locale}/o/{orgSlug}/dashboard/...`
- **Canonical portal URLs:** `/{locale}/p/{portalSlug}/...` for org-owned external/constrained portals.
- **Path builders:** `organizationDashboardPath`, `organizationNexusPath`, `organizationHrmPath`, `organizationAdminPath`, `platformAdminPath`; portal helpers live in `lib/portal/` — use these, never hard-code paths.
- **revalidatePath:** `toLocaleOrgDashboardRevalidatePattern("/contacts")` for ERP; `toLocaleRoutePattern("/path")` for static locale routes. Never revalidate a single locale.
- **Slug params:** validate org slugs with `normalizeOrgSlugParam` before DB resolution; portal slugs must use `normalizePortalSlugParam` from `lib/portal/`.
- **Client shell** imports `#lib/dashboard-module-paths` (not feature barrels) to avoid pulling `server-only` into the client bundle.

### Portal routing

- **Route root:** `/{locale}/p/{portalSlug}` is the canonical portal boundary for employee, supplier, customer, investor, and future org-owned external-facing surfaces.
- **Authority:** `/p` resolves organization context through `portalSlug`; it does not rely on active Workbench org switching.
- **Guard model:** portal layouts use portal context guards from `lib/portal/`; audience-specific guards enforce employee/supplier/customer/investor subject access.
- **Business logic:** portal routes compose feature modules only through public doors; ERP/domain logic remains in `lib/features/<module>/`.
- **Shell:** `/p` uses `PortalShell` from `components2/portal-shell/`; it must never mount `WorkbenchShell` or `AppShell`.
- **Rule:** `.cursor/rules/portal-directory.mdc`

### Locale-first routing

- `localePrefix: "always"` — all public URLs include `/{locale}/`.
- **Edge entry:** `proxy.ts` runs `createIntlMiddleware` then presence-only cookie check for `/o`, `/p`, `/account`, `/operator`, `/accept-invitation`, `/console`. Matcher excludes `api`, `_next`, `_vercel`, `.well-known`, static assets.
- **Never emit bare `/sign-in`, `/o`, or `/p` from server** — use `toLocalePath(locale, path)`.
- **Post-login:** `/{locale}/console` is the loading bay (single-org → redirect to nexus immediately).
- **`callbackUrl`** must be locale-prefixed + validated via `resolvePostAuthCallbackUrl`.
- **Rule:** `.cursor/rules/i18n-directory.mdc`

### Nexus runtime (org root)

```
Nexus owns the OS.  Surfaces execute work.  Materials are governed.
```

- **Org root:** `/{locale}/o/{orgSlug}` → `/{locale}/o/{orgSlug}/nexus`.
- **Shell mounts at:** `app/[locale]/o/[orgSlug]/layout.tsx` (not dashboard layout) — ensures utility bar / dock / command persist across surfaces.
- **Components/workbench/** owns all shell chrome. **Components/nexus/** owns Nexus Field + Lynx summon only. No `components/dashboard/`.
- **NexusSnapshot:** one server-built snapshot per request — no per-widget fetching.
- **Forbidden vocabulary:** dashboard (as org root noun), widget, cockpit, home (as org root noun), AI mode, notification center.
- **Shell is final (ADR-0005):** do not reintroduce legacy shell wrappers.

### Workbench chrome (shell)

- `AppShell` / `AppSubLayout` = `WorkbenchShell` / `WorkbenchSubLayout` — import from `#components/workbench/*`.
- Nested rail surfaces (org admin, HRM) use `AppSubLayout` inside the parent `AppShell`.
- Shell schema kernel: `workbench-rail.schema.ts` is the single source of truth for rail slots. Builders are pure mappers. Cross-cutting structural changes → `ts-morph` codemod under `scripts/refactors/`.
- Portal chrome is separate: `/p/{portalSlug}` uses `PortalShell` from `components2/portal-shell/`, never `WorkbenchShell` or `AppShell`.

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
- Routes: `/dashboard/hrm/employees`, `/dashboard/hrm/employees/[employeeId]`, `/dashboard/hrm/[segment]`.
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

### Platform admin (`/operator`)

- Module: `lib/features/platform-admin/` — `PLATFORM_ADMIN_CAPABILITIES` drives nav + sanitizer.
- Guards: `requireGlobalAdminSession()` + `requireRecentAuthStepUp` in layout.
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
| OpenTelemetry (`@vercel/otel`) | Execution map — custom spans via `lib/otel-span.server.ts` (Node only) |
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
4. Run `pnpm db:migrate:local` (or `:vercel`) for every Neon branch that serves traffic.
5. Enable **Neon Auth** in Neon Console for each branch (creates `neon_auth` schema).
6. Add `OPENAI_API_KEY` (+ optional `EMBEDDING_MODEL`) to Vercel env vars.
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

### Public help docs (Fumadocs MDX)

- **`/{locale}/help-docs`** — public locale-first documentation (Fumadocs MDX), **no auth cookie gate** — naming parallel to **`/{locale}/legal-docs`**.
- **`content/help-docs/`** — MDX authoring root; **`source.config.ts`** + **`.source/`** (generated by `fumadocs-mdx` / `next build`) feed `lib/help-docs-source.ts`.

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
components/ → ERP module UI only
schemas/    → Zod validation contracts
constants.ts · types.ts · index.ts · server.ts (optional) · client.ts (optional)
*.contract.ts
```

**`index.ts` is required.** Do not add categories not in this list without updating AGENTS.md first.

**Barrels:**

- `index.ts` — primary door for Server Components (constants, schemas, async server UI, Server Actions). Do not import from Client Components if the module re-exports async server panels.
- `client.ts` — types + Server Actions only, for Client Components.
- `server.ts` — `server-only` re-exports for layouts/shells that need server-only query graphs.

### Import boundary (enforced by ESLint + `check-agent-contract.mjs`)

```ts
// ✅ Allowed
import { listContactsForOrganization } from "#features/contacts"
import { archiveContactAction } from "#features/contacts/client"
import { listOrgImportJobs } from "#features/org-admin/server"

// ❌ Forbidden
import { listContactsForOrganization } from "#features/contacts/data/contacts.queries"
```

### File naming convention (`components2/`)

Files in `components2/` follow a `<entity>.<aspect>.<layer>` pattern:

| Pattern                 | When to use                                  | Examples                                      |
| ----------------------- | -------------------------------------------- | --------------------------------------------- |
| `<entity>.schema.ts`    | Zod schemas + `z.infer<>` types              | `rail.schema.ts`                              |
| `<entity>.tsx`          | RSC entry — `server-only`, no `"use client"` | `app-shell.tsx`, `sub-layout.tsx`             |
| `<entity>.client.tsx`   | Client component — `"use client"`            | `app-shell.client.tsx`, `nav-rail.client.tsx` |
| `<entity>.tsx` (shared) | Pure layout/composition, no directive        | `utility-bar.tsx`, `surface.tsx`              |

**Rules:**

- File name = primary export name (`app-shell.tsx` → exports `AppShell`).
- `*.schema.ts` for all Zod contracts — never bare `schema.ts`.
- No generic names: `schema.ts`, `shell.tsx`, `rail.tsx` are forbidden without an entity qualifier.
- Full spec: `.cursor/rules/shell-directory.mdc` → _File naming convention_.

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
```

### Canonical directory shape

```
app/
  [locale]/
    (auth)/**     ← sign-in, sign-up, verify-email, forgot/reset password, accept-invitation
    (iam)/**      ← account, security
    console/      ← post-login loading bay
    operator/     ← platform admin surface
    p/[portalSlug]/ ← org-owned portal boundary (PortalShell; no WorkbenchShell)
    o/[orgSlug]/
      layout.tsx  ← AppShell mounts here
      page.tsx    ← redirect to nexus
      nexus/
      admin/      ← org admin workbench
      dashboard/
        contacts/ · hrm/ · orbit/ · lynx/ · …
  api/auth/ · cron/ · upload/ · webhooks/ · integrations/ · erp/<module>/

components2/
  portal-shell/   ← portal chrome only

lib/
  auth/           ← IAM control plane (index.ts = public door)
  db/             ← schema.ts + index.ts
  erp/            ← shared primitives only
  portal/         ← portal control plane (slug, path, resolver, guard, audience contracts)
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

May contain only `components/`, `schemas/`, `index.ts`, `client.ts`. Must not fetch domain data or own business logic. See ADR-0011.

---

## 7. Design system

| Layer               | Location                             | Notes                                                                   |
| ------------------- | ------------------------------------ | ----------------------------------------------------------------------- |
| Semantic tokens     | `app/globals.css` (`:root`, `.dark`) | OKLCH palette, elevation, motion, density                               |
| Tailwind bridge     | `app/globals.css` (`@theme inline`)  | Every `var(--)` must resolve to `:root`/`.dark`                         |
| Primitive contracts | `lib/design-system.ts`               | Preferred `ui.*` aliases, allowlisted radii, Zod parsers                |
| Primitives shelf    | `components/ui/**`                   | Import only via `#components/ui/*` — never filesystem-relative          |
| Dev overlays        | `components/dev/`                    | Gated (`NODE_ENV === "development"`); use existing token utilities only |
| Policy              | `docs/design-system/governance.md`   | Code leads; Figma mirrors code                                          |

**Rules:**

- `radix-ui` / `@radix-ui/*` / `@base-ui/react` confined to `components/ui`.
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
