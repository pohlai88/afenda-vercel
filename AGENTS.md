# Agent guide — afenda-vercel

Instructions for AI agents working in this repository. Stack: **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**-style components.

**Read first:** [§4 Enforcement & governance artifacts](#4-enforcement--governance-artifacts), [§5 ERP stack + locale-first application surface](#5-erp--full-stack-stack-this-repo) (including [locale-first routing](#locale-first-application-surface)), and [§6 ERP clean directory contract](#6-erp-clean-directory-engineer-contract-required). They define tooling gates, product routing behavior, and non‑negotiable boundaries.

### IDE & AI quickstart (vibe coding)

Use this block for fast orientation; deep rules stay in the numbered sections below.

| Goal                    | Where to look / what to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jump to a topic         | [Contents](#contents) — anchor links to every §                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Nexus runtime           | **`components/nexus/`** + **`lib/features/nexus/`** — **Nexus owns the OS** (utility bar / dock / command / material runtime), **Surfaces execute work** under `/dashboard/*`, **Dashboard chrome is being demoted**, **Materials are governed**, **Dense ERP remains opaque**. Mounted at **`app/[locale]/o/[orgSlug]/layout.tsx`**; the **org root** **`app/[locale]/o/[orgSlug]/page.tsx`** is the **Nexus Field** (orientation + pressure + truth map + priority lanes + recent resolution). See **§5** — [Nexus runtime (org root)](#nexus-runtime-org-root).                                                                                                                                                                                                                                                                                                                                                                                                              |
| ERP feature work        | `lib/features/<module>/` · public imports `#features/<module>` only · no cross-module deep imports (**§6**, **§4.1**)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| OneThing                | **`lib/features/onething/`** — three barrels: **`#features/onething`** (RSC composition / route wiring), **`#features/onething/server`** (`server-only` data layer), **`#features/onething/client`** (client islands + pure helpers `pickNextRankedId` / `splitOneThingDraft` / `clearOneThingClientStorage`) · canonical replacement for the old task surface · routes **`/dashboard/onething`** and **`/account/onething`** · operational document computing (two-pane shell, single-line list, editorial detail pane, summary-first audit footer, distributed keyboard ownership) · **prime directive: optimizes for operational inevitability, not feature discoverability** · authoritative contracts in [`.cursor/rules/onething-directory.mdc`](.cursor/rules/onething-directory.mdc) · replacement UI surface: [`ADR-0002 — iThink`](docs/decisions/0002-ithink.md)                                      |
| Operational primitives  | **`#lib/erp/*.shared.ts`** + **`#lib/erp/audit-7w1h.server.ts`** — Past · Now · Next temporal spine, CRUD-SAP audit grammar, 7W1H + IAM composition (**§5** — [Operational primitives](#operational-primitives-past--now--next-crud-sap-7w1h))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Operational execution   | **`#features/execution`** contract + enqueue API · Workflow DevKit wiring (**§5** — _Operational execution_) · import pilot: [`enqueueOrgImportJobWorkflowRun`](lib/features/execution/index.ts) + [`import-job-run.workflow.ts`](lib/features/org-admin/data/import-job-run.workflow.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Operational simulation  | **`#features/simulation`** — AsyncLocalStorage provenance + scenario replay into `onething` / `iam_audit_event` (**§5** — _Operational simulation_) · gated by **`AFENDA_ENABLE_SIMULATION=1`** · CLI **`pnpm simulate:replay`** / **`pnpm simulate:clear`** (**§2**) · rule [`.cursor/rules/simulation-directory.mdc`](.cursor/rules/simulation-directory.mdc)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Org admin workbench     | [`/o/[orgSlug]/admin`](app/[locale]/o/[orgSlug]/admin/) · capability registry **`ORG_ADMIN_CAPABILITIES`** in [`#features/org-admin`](lib/features/org-admin/index.ts) drives sidebar / sanitizer / paths / audit prefixes · event taxonomy **`ORG_ADMIN_EVENT_NAMESPACES`** (`iam.* · org.* · erp.* · governance.* · integration.* · workflow.* · system.*`) · narrative in [Organizational control plane](#organizational-control-plane-oorgslugadmin) (§5) · rule [`.cursor/rules/org-admin-directory.mdc`](.cursor/rules/org-admin-directory.mdc)                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Human resources (HRM)   | **`lib/features/hrm/`** · capability registry **`HRM_CAPABILITIES`** · routes **`/{locale}/o/{orgSlug}/dashboard/hrm`**, **`.../dashboard/hrm/employees`**, **`.../dashboard/hrm/employees/[employeeId]`**, and **`.../dashboard/hrm/{segment}`** (placeholders) · path helpers **`organizationHrmPath`** / **`organizationHrmRootPath`** / **`organizationHrmEmployeePath`** · **`#features/hrm/client`** re-exports workforce **Server Actions** (`createEmployeeAction`, `updateEmployeeAction`, `archiveEmployeeAction`, `createDraftContractAction`, `activateContractAction`, `terminateContractAction`, `upsertPayrollProfileAction`, `attachEmployeeDocumentAction`) · payroll rule-pack types (**`#features/hrm/server`**, Phase 3+) · Phase **1A** tables **`hrm_job_grade`**, **`hrm_department`**, **`hrm_position`**, **`hrm_employee`** (**`0006_mushy_charles_xavier`**) · Phase **1B** tables **`hrm_employment_contract`**, **`hrm_payroll_profile`**, **`hrm_document`** + **`hrm_employee.currentEmploymentContractId`** (**`0010_hrm_contract_payroll_document`**) · IAM audits **`erp.hrm.employee.{create|update|archive}`**, **`erp.hrm.contract.{create|activate|terminate}`**, **`erp.hrm.payroll_profile.upsert`**, **`erp.hrm.document.attach`** · tests **`tests/unit/hrm-contract.test.ts`**, **`tests/unit/hrm-employee-schema.test.ts`**, **`tests/e2e/hrm-workforce-isolation.spec.ts`** (`@hrm`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Dashboard UI            | `#components/ui/*` · **`#components/nexus/*`** (Nexus runtime shell — utility bar, command, dock, Lynx summon; **doctrine:** [`ADR-0001 — Spatial OS`](docs/decisions/0001-afenda-spatial-os-shell.md) + **`.cursor/rules/app-shell-directory.mdc`**) · **`#components/nexus-route-loading`** (segment `loading.tsx` re-export) · **`#components/dev/*`** (dev-only overlays; gated — **§9**) · `#lib/design-system` · tokens `app/globals.css` (**§7**)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| i18n & locale-first UX  | [Locale-first application surface](#locale-first-application-surface) in **§5** · **`next-intl`** · `localePrefix: "always"` (e.g. `/en/...`) · [`i18n/routing.ts`](i18n/routing.ts) + [`i18n/request.ts`](i18n/request.ts) · [`messages/<locale>.json`](messages/en.json) · **`Link` / `useRouter` / `usePathname` from `#i18n/navigation`** · **Server `redirect`:** `next/navigation` + [`toLocalePath(locale, "/path")`](lib/i18n/locales.shared.ts) (`locale` from `params` or [`getRequestAppLocale`](lib/i18n/request-locale.server.ts)) · **`revalidatePath`:** [`toLocaleRoutePattern`](lib/i18n/locales.shared.ts) for static locale routes; **[`toLocaleOrgDashboardRevalidatePattern`](lib/i18n/locales.shared.ts)** for ERP dashboard modules under `/o/[orgSlug]/dashboard/...` · locales in [`lib/i18n/locales.shared.ts`](lib/i18n/locales.shared.ts) · **[`proxy.ts`](proxy.ts)** forwards locale for `<html lang>` · **`.cursor/rules/i18n-directory.mdc`** |
| Next / RSC              | Server Components default · async `cookies` / `headers` / `params` · thin `proxy.ts` — also `.cursor/rules/nextjs-best-practices.mdc` (always on)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Green CI                | `pnpm verify` (lint → typecheck → `test:ci` → format) — or `pnpm smoke` before a big push (**§2**); optional `pnpm lint:a11y`; Playwright in CI after `pnpm build`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Tests / E2E             | **§2** commands + **Testing directory contract** below; Vitest (Node-first `tests/unit`); Playwright (`tests/e2e`); default **`http://127.0.0.1:3001`** + **`next start`** so **`pnpm dev`** can stay on **3000** · `.cursor/rules/testing-directory.mdc`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Local editor / Cursor   | `.editorconfig` + `.gitattributes` (LF / UTF-8 / 2-space) · `.vscode/settings.json` (workspace TS, Prettier + ESLint on save, Tailwind v4 = `app/globals.css`) · `.vscode/extensions.json` + `.vscode/tasks.json` · `.cursorignore` trims index noise                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Neon / Vercel MCP       | [§5 Validating with Neon and Vercel MCP](#validating-with-neon-and-vercel-mcp) · configure servers in [`.cursor/mcp.json`](.cursor/mcp.json) (`neon`, `vercel`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| DB / Drizzle migrations | **`lib/db/schema.ts`** (public tables only — no `neon_auth.*` DDL) · **`pnpm db:migrate:local`** / **`pnpm db:migrate:vercel`** per branch (each runs **`pnpm lint:fixtures-parity`** after migrate — fixture/message parity, not schema) · **`pnpm lint:drizzle-journal`** (journal ↔ SQL) · **`pnpm db:generate`** in a **TTY** when diffing schema · rule [`.cursor/rules/drizzle-migration-ledger.mdc`](.cursor/rules/drizzle-migration-ledger.mdc) · [Drizzle migrations (journal + SQL)](#drizzle-migrations-journal--sql) in **§4**                                                                                                                                                                                                                                                                                                                                                                                  |

## Contents

1. [How to use this document](#1-how-to-use-this-document)
2. [Commands & quality gates](#2-commands--quality-gates)
3. [Toolchain](#3-toolchain)
4. [Enforcement & governance artifacts](#4-enforcement--governance-artifacts)
5. [ERP / full-stack stack](#5-erp--full-stack-stack-this-repo) — [Neon + Vercel + pgvector (checklist)](#neon--vercel--pgvector-checklist) · [Validating with Neon and Vercel MCP](#validating-with-neon-and-vercel-mcp) · [locale-first application surface](#locale-first-application-surface) · [Operational primitives](#operational-primitives-past--now--next-crud-sap-7w1h)
6. [ERP clean directory engineer contract](#6-erp-clean-directory-engineer-contract-required)
7. [Design system](#7-design-system)
8. [Critical Next.js practices (App Router)](#8-critical-nextjs-practices-app-router)
9. [Repo-specific rules](#9-repo-specific-rules)
10. [Decision protocol when constraints conflict](#10-decision-protocol-when-constraints-conflict)
11. [Documentation refresh](#11-documentation-refresh)

---

## 1. How to use this document

| Role                          | Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Single operating contract** | This file (`AGENTS.md`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| **Always-on Cursor rules**    | `.cursor/rules/agents-md-mandatory.mdc` (preload + edit-boundary checks) · `.cursor/rules/nextjs-best-practices.mdc` (runtime contract — RSC, routing, caching, proxy) · `.cursor/rules/frontend-quality-contract.mdc` (React/TS quality — anti-patterns, composition, ERP interface rules, layout geometry ownership)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **Design / UI edits (globs)** | `.cursor/rules/design-system-enforcement.mdc` (`*.{ts,tsx,css}`) · `.cursor/rules/design-system-docs-enforcement.mdc` (`docs/design-system/**/*.md`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Other focused rules**       | `i18n-directory.mdc` · `iam-directory.mdc` · `lynx-directory.mdc` (globs: `lib/features/lynx/**`, `components/nexus/**`, Lynx routes/API, `messages`) · `knowledge-directory.mdc` (globs: `lib/features/knowledge/**`, `app/**/knowledge/**`) · `erp-primitives.mdc` (globs: `lib/erp/**`) · `onething-directory.mdc` (globs: `lib/features/onething/**`, app OneThing routes, OneThing tests) · `simulation-directory.mdc` (globs: `lib/features/simulation/**`, `lib/erp/scenario-types.shared.ts`, `lib/erp/simulation-context.server.ts`, provenance writers / org audit reads, `scripts/simulate-*.ts`) · `drizzle-migration-ledger.mdc` (globs: `drizzle/**`, `lib/db/schema.ts`, `drizzle.config.ts`) · `images.mdc` (globs: `**/*.{ts,tsx}`) · `brand-assets.mdc` (globs: `public/**`, `lib/site.ts`) · `org-admin-directory.mdc` (globs: admin routes) · `app-shell-directory.mdc` (globs: `components/nexus/**`) · `material-semantics.mdc` (globs: `**/*.{ts,tsx,css}` — shell material phases, `data-phase` / `data-lynx`; CI: `check-design-contract.mjs`) · `dev-directory.mdc` (globs: `components/dev/**`) · `testing-directory.mdc` (globs: `tests/**`) · `knip-directory.mdc` (globs: `knip.json`, `package.json`, `scripts/**`) · `design-system-enforcement.mdc` (globs: `**/*.{ts,tsx,css}`, `docs/design-system/**`) · `figma-code-connect-workflow.mdc` (globs: `components/ui/**`, `lib/design-system.ts`) · **App Router runtime doctrine:** `layout-contract.mdc` (runtime kernel, Tier A/B, `layout.tsx`) · `error-boundaries.mdc` (recovery boundary, RouteEnvelope bridge, `error.tsx`) · `loading-contract.mdc` (waiting contract, streaming, `loading.tsx`) · `not-found-contract.mdc` (invalid truth boundary, shell continuity, `not-found.tsx`) · `template-contract.mdc` (reset boundary, remount semantics, `template.tsx`) |

**Change order:** If a task needs a new architectural category, API family, or folder vocabulary, **update this file first** in the same change, then implementation. Keep `.cursor/rules/*` aligned when they mirror this contract (they must not contradict it).

**Mechanical alignment:** `scripts/check-agent-contract.mjs` declares `REQUIRED_FILES` (this doc + `agents-md-mandatory.mdc` + `design-system-enforcement.mdc` + `design-system-docs-enforcement.mdc` + `material-semantics.mdc` + `i18n-directory.mdc` + `lynx-directory.mdc` + `erp-primitives.mdc` + `onething-directory.mdc` + `simulation-directory.mdc` + `eslint.config.mjs` + `check-design-contract.mjs` + `tests/unit/fixtures-i18n-parity.test.ts`) and root-tooling allowlisting (includes `scripts/check-drizzle-journal.mjs`). Do not remove or weaken those paths without updating the script and this section.

---

## 2. Commands & quality gates

| Command                               | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm dev`                            | Dev server (Turbopack)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pnpm build` / `pnpm start`           | Production build / serve                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pnpm lint`                           | `lint:agent-contract` → `lint:drizzle-journal` → **`lint:fixtures-parity`** → ESLint (`--max-warnings 0`, `--report-unused-disable-directives`) → `lint:design-contract`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pnpm lint:drizzle-journal`           | `node scripts/check-drizzle-journal.mjs` — **`drizzle/*.sql`** tags must match **`drizzle/meta/_journal.json`** in order (see [Drizzle migrations](#drizzle-migrations-journal--sql))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pnpm lint:fixtures-parity`           | Vitest **`tests/unit/fixtures-i18n-parity.test.ts`** — `tests/fixtures/*` ↔ **`messages/en.json`**, auth form sources, **`scripts/seed-dev-users.mjs`**, dev sign-in panel, org audit CSV header tail (**no DB**)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `pnpm lint:a11y`                      | ESLint with `eslint-plugin-jsx-a11y` recommended rules (`eslint-a11y.config.mjs`) — separate from default `lint` until baseline is clean                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pnpm typecheck`                      | `tsc --noEmit` — app code only (`tests/` and `scripts/` excluded for speed; each has its own split tsconfig)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `pnpm typecheck:test`                 | `tsc --noEmit -p tsconfig.test.json` — type-checks `tests/` in isolation (Playwright + Vitest types kept out of the main graph)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `pnpm typecheck:scripts`              | `tsc --noEmit -p tsconfig.scripts.json` — type-checks `scripts/` in isolation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm format` / `pnpm format:check`   | Prettier (Tailwind class sorting via `prettier.config.mjs`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `pnpm knip` / `pnpm knip:production`  | Dead code & dependency graph ([Knip](https://knip.dev)) — **the repo's unused-surface verdict**, not a cleanup helper. Strict (`knip.json`: unused files/deps/imports/exports/types as errors). Default fix order: **delete → fix import → barrel → narrow `ignoreIssues`**. Suppressions only for intentional public, framework-discovered, or shelf surface — never as a blanket escape hatch. Feature internals (`data/`, `actions/`, `schemas/`) are suppressed because they are route-discovered or barrel-proxied, not because they are dead; genuinely unused files there must be deleted. `knip:production` = ship-only dependency view. Full doctrine: **`.cursor/rules/knip-directory.mdc`**. |
| `pnpm verify`                         | `lint` → `typecheck` → `typecheck:test` → `typecheck:scripts` → **`knip`** → `test:ci` → `format:check` (local pre-merge)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `pnpm test`                           | Vitest watch mode (`tests/unit`, Node by default)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `pnpm test:ci`                        | `node scripts/with-env.mjs` + Vitest single run **with v8 coverage** (`.artifacts/coverage/`; see `vitest.config.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `pnpm test:coverage`                  | Same env merge as `test:ci` — discoverability for coverage runs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `pnpm test:e2e`                       | `pnpm build` then Playwright (`tests/e2e`; `with-env.mjs` loads `.env.local`; Playwright `webServer` uses `next start` on **3001** when no external base URL)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm test:e2e:ci`                    | Same as `test:e2e` — prod-shaped E2E                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pnpm env:sync`                       | `.env.config` → `.env.local` (see `.env.config.example`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pnpm db:migrate:local`               | `drizzle-kit migrate` with **`.env.local`**, then **`pnpm lint:fixtures-parity`** (deterministic fixture/message parity after migrate — no schema coupling, catches stale demo copy)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pnpm db:migrate:vercel`              | Same after **`pnpm env:pull-vercel`** → `.env.vercel`, then **`pnpm lint:fixtures-parity`**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `pnpm db:generate`                    | `drizzle-kit generate` — diff **`lib/db/schema.ts`** → new SQL under `drizzle/` + updates to `drizzle/meta/`; requires an **interactive TTY** when Drizzle prompts for renames/conflicts ([Drizzle migrations](https://orm.drizzle.team/docs/migrations))                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `pnpm db:push:local` / `pnpm db:push` | Apply schema directly to the DB (**prototyping / throwaway branches**); not a substitute for versioned SQL on shared branches ([push vs migrate](https://orm.drizzle.team/docs/tutorials/drizzle-with-vercel-edge-functions))                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `pnpm verify:upstash`                 | PING Upstash Redis when `UPSTASH_REDIS_REST_*` are in `.env.local` ([redis-js](https://github.com/upstash/redis-js))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `pnpm simulate:replay`                | `node scripts/with-env.mjs tsx scripts/simulate-replay.ts` — replay a registered scenario for an org (**requires `AFENDA_ENABLE_SIMULATION=1`**; args: `organizationId`, `scenarioId`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `pnpm simulate:clear`                 | `node scripts/with-env.mjs tsx scripts/simulate-clear.ts` — delete simulation rows for a run + write **`org.simulation.scenario.clear`** (**requires `AFENDA_ENABLE_SIMULATION=1`**; args: `organizationId`, `simulationRunId`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

**Before merge** (boundaries, modules, routing, APIs, or design tokens):

- `pnpm verify` (or individually: `pnpm lint`, `pnpm typecheck`, `pnpm knip`, `pnpm test:ci`, `pnpm format:check`)
- `pnpm lint:a11y` when touching interactive UI (optional gate until folded into `lint`)
- CI also runs Playwright after `pnpm build` when browsers are installed

Do not mark work complete if these fail for reasons introduced by the change.

Path aliases (see `package.json`): `#components/*`, `#lib/*`, `#hooks/*`, `#features/*`.

### Testing directory contract

- **`tests/fixtures/`** — Canonical **deterministic data**: UUIDs, emails, slugs, user-visible **copy** for assertions, small static factories. Consumed by Vitest and Playwright. **`tests/unit/fixtures-i18n-parity.test.ts`** (**`pnpm lint:fixtures-parity`**) asserts parity vs **`messages/en.json`** and related sources; **`pnpm db:migrate`** / **`db:migrate:*`** run the same check after migrations (no DB connection — catches stale demo/assertion copy). **Forbidden:** Playwright/browser imports, ERP business workflows, hidden mega user journeys.
- **`tests/unit/`** — Vitest is **Node-first** by default. Use `// @vitest-environment jsdom` only for small DOM/React Testing Library tests, preferably named **`*.dom.test.tsx`**. Do not introduce Vitest **`projects`** until DOM suites become large enough to justify the split.
- **Coverage** — Uses **V8** (`pnpm test:ci`). **`lib/auth/**/\*.shared.ts`** and **`lib/auth/callback-path.ts`** require **≥ 95%** coverage (identity-sensitive, deterministic). **Global** executed coverage is **ratcheted** from the current baseline toward **80%**; do **not** enable **`coverage.all`** until the repo has enough intentional unit breadth. Config: [`.config/vitest.config.ts`](.config/vitest.config.ts) — Lynx dashboard/client islands that pair with DB + AI (`nl-sql-demo\*.tsx`, truth streaming UI, etc.), **Workflow DevKit** entrypoints (`import-job-run.workflow.ts`, `enqueueOrgImportJobWorkflowRun`), and **HRM Phase 1A** workforce actions/queries + UI islands (`lib/features/hrm/actions/employee.actions.ts`, `employee.queries.server.ts`, `components/**/*.tsx`) are listed under **`coverage.exclude`** so Vitest gates stay meaningful; prefer Playwright / runtime for those flows.
- **Next.js + Vitest** — Async Server Components are not unit-tested in isolation; use **E2E** for async routes and full flows. See [Next.js: Vitest](https://nextjs.org/docs/app/guides/testing/vitest).
- **`tests/e2e/`** — Playwright specs (`*.spec.ts`). Prefer **explicit** steps (`goto`, `getByRole`, `getByLabel`). Tag stable gates (e.g. **`@smoke`**). Credential-heavy org-admin flows may use **`@orgAdmin`** for targeted runs (`playwright test --grep @orgAdmin`). **App Router** surfaces are validated with Playwright for now — do not treat **`app/**`** as a Vitest coverage gate until the strategy changes. Default base URL is **`http://127.0.0.1:3001`**: Playwright starts **`next start -p 3001`** (after **`pnpm build`** via **`pnpm test:e2e`**) so **`pnpm dev`** on **3000** is unchanged. Set **`PLAYWRIGHT_BASE_URL`** or **`BASE_URL`** to point at another server and skip the built-in **`webServer`**. **CI** runs **`pnpm build`** then **`playwright test`**; keep port **3001\*\* free (or override the base URL). Optional **`E2E_ORG_ADMIN_EMAIL`** / **`E2E_ORG_ADMIN_PASSWORD`** (and **`E2E_ORG_SLUG`** if slug detection fails) enable org-admin flows including **`org-admin-import-job-workflow.spec.ts`** (stages a one-row CSV, runs **`enqueueOrgImportJobWorkflowRun`**, polls until **`state: completed`**). Optional **`E2E_SIGNUP_EMAIL`** / **`E2E_SIGNUP_PASSWORD`** / **`E2E_SIGNUP_NAME`** enable **`individual-signup-onething.spec.ts`** sign-up → **`/check-email`** (plus-address friendly **`E2E_SIGNUP_EMAIL`**). Pre-sign-in routes (**`/sign-up`**, **`/forgot-password`**, **`/reset-password`**, **`/check-email`**, **`/verify-email`**) use **`@smoke`** coverage in [`tests/e2e/auth-public-shell.spec.ts`](tests/e2e/auth-public-shell.spec.ts); a **full** password-reset journey (real emailed **`token`**) is **not** automated in CI without a mail sink or provider test hook — document env when adding one.
- **`tests/e2e/utils/`** — Optional **browser helpers** (navigation, auth helpers). **Import** IDs/copy from `tests/fixtures`; do not duplicate canonical strings. Avoid deep **`test.extend`** chains; keep specs readable.

**Transient tool output** (gitignored **`.artifacts/`** only — keeps the repo root minimal): Vitest coverage → **`.artifacts/coverage/`**; Playwright JUnit (CI) → **`.artifacts/playwright-junit.xml`**; Playwright traces/screenshots/videos → **`.artifacts/playwright/test-results/`**. Do not commit reports under `tests/` or ad hoc root folders. Delete any legacy root **`coverage/`**, **`test-results/`**, or **`playwright-report/`** trees left over from older configs so ESLint and searches stay clean.

---

## 3. Toolchain (aligned with Next.js / Vercel defaults)

- **Node:** `.node-version` / `.nvmrc` → **24** (matches Vercel project default **24.x** and CI); `package.json` **`engines.node`** `>=24.0.0`.
- **pnpm:** **`packageManager`** `pnpm@10.21.0` (lockfile v9); use Corepack or match CI pin.
- **TypeScript:** `tsconfig` — **`target` ES2022**, **`lib` ES2022 + DOM**, **`forceConsistentCasingInFileNames`**, Next `plugins`, **`typedRoutes`** via **`.next/types` only** — **`exclude`** **`.next/dev`** so dev and prod typed-route validators do not merge; **`pnpm build`** may suggest adding **`.next/dev/types`** — drop that include if it reappears (keep **`exclude`**).
- **Next config:** typed **`next.config.ts`** (`NextConfig` from `next`).
- **Drizzle Kit:** `strict` + `verbose` in [`drizzle.config.ts`](drizzle.config.ts). **`drizzle-kit generate`** emits SQL under `drizzle/` and updates `drizzle/meta/` (`_journal.json` + snapshots per [Drizzle migrations](https://orm.drizzle.team/docs/migrations)); **`drizzle-kit migrate`** applies **only** migrations listed in the journal. Governance: [Drizzle migrations (journal + SQL)](#drizzle-migrations-journal--sql) in **§4** and **`.cursor/rules/drizzle-migration-ledger.mdc`**.

---

## 4. Enforcement & governance artifacts

Boundaries are enforced by **scripts + ESLint**, not by this markdown alone.

### 4.1 Contract scripts

| Script                                                                   | What it enforces                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`scripts/check-agent-contract.mjs`](scripts/check-agent-contract.mjs)   | Required governance files (see §4.2); rule strength (mandatory agent rules stay `alwaysApply: true`; ESLint must restrict `#features/*/*`); forbidden dump dirs; top-level allowlist on **new** paths in git diff; `lib/features/<module>/` shape (`index.ts` + allowed root entries); **deep `#features/a/b` imports** only when same-module or from outside `lib/features` per script logic |
| [`scripts/check-design-contract.mjs`](scripts/check-design-contract.mjs) | Under `app/`, `components/`, `hooks/`, `lib/features/`, and **`lib/design-system.ts`**: forbidden pill radii / `shadow-2xl` / palette utilities in `components/ui` / arbitrary `rounded-[` (allowlist) / **`hover:bg-primary/` …** on filled brand hovers in primitives; **`@theme inline` `var(--*)` ↔ `:root` / `.dark` definitions** in [`app/globals.css`](app/globals.css); **material adoption drift** (inline `backdropFilter` / `willChange`, Tailwind `blur-[…]` / `backdrop-blur-[…]`, `animation … infinite`, legacy `--af-water-*` / `.af-material-water` / `.af-material-transitioning` outside `app/globals.css`) — see **ADR-0001 §13** + **`.cursor/rules/material-semantics.mdc`** |
| [`scripts/check-drizzle-journal.mjs`](scripts/check-drizzle-journal.mjs) | Every top-level `drizzle/NNNN_*.sql` file has a matching `tag` in [`drizzle/meta/_journal.json`](drizzle/meta/_journal.json) in the same order with contiguous `idx` (so `drizzle-kit migrate` applies all shipped SQL). See [Drizzle migrations (journal + SQL)](#drizzle-migrations-journal--sql).                                                                                          |
| **`pnpm lint:fixtures-parity`** (Vitest) | [`tests/unit/fixtures-i18n-parity.test.ts`](tests/unit/fixtures-i18n-parity.test.ts) — deterministic parity for **`tests/fixtures/*`** vs **`messages/en.json`**, canonical auth surfaces, **`lib/auth/org-audit-csv.shared.ts`** CSV tail, **`scripts/seed-dev-users.mjs`**, and **`components/dev/dev-signin-panel.tsx`**. Runs under **`pnpm lint`** and after **`pnpm db:migrate` / `db:migrate:*`**. |

### Drizzle migrations (journal + SQL)

Authoritative flow follows [Drizzle Kit migrations](https://orm.drizzle.team/docs/migrations) (Context7 library **`/websites/orm_drizzle_team`**):

- **`lib/db/schema.ts`** is the schema source of truth for **public** Drizzle-owned tables. Do not add **`neon_auth.*`** DDL here (Neon manages that schema — [`lib/db/schema-neon-auth.ts`](lib/db/schema-neon-auth.ts) is query-only).
- **`drizzle-kit generate`** produces SQL files and updates **`drizzle/meta/`** (`_journal.json` and snapshot JSON used for the next diff). Run it from a **real terminal** when Drizzle prompts for ambiguous renames (`isTTY` required in CI/agent shells).
- **`drizzle-kit migrate`** applies migrations **registered in `_journal.json` only** — orphan `drizzle/*.sql` files that are not listed will never run on a fresh database.
- **Hand-written SQL:** `pnpm exec drizzle-kit generate --custom --name=<slug>` then edit the file; still commit **`_journal.json`** changes together with the SQL.
- **`pnpm db:push` / `pnpm db:push:local`:** acceptable for **throwaway** local branches only ([push vs migrate](https://orm.drizzle.team/docs/tutorials/drizzle-with-vercel-edge-functions)); shared environments rely on **`pnpm db:migrate:*`** after merge.
- **`pnpm db:migrate` / `pnpm db:migrate:local` / `pnpm db:migrate:vercel`:** after **`drizzle-kit migrate`** succeeds, runs **`pnpm lint:fixtures-parity`** (Vitest — deterministic **`tests/fixtures/*`** vs catalogs and seed/dev sources). This does **not** validate schema against the DB; it hooks migrate completion so local “DB refresh” workflows also refresh assertion drift checks.
- **Do not** delete all of `drizzle/meta/` and run `generate` while legacy numbered SQL migrations still exist — Drizzle treats the folder as empty and emits a **new baseline** migration that duplicates the whole schema.
- **Snapshot debt:** if `drizzle-kit generate` prompts or fails in non-interactive environments, resolve by running `generate` locally until `drizzle/meta/*_snapshot.json` catches up to the journal; **`pnpm lint:drizzle-journal`** enforces SQL ↔ journal parity only (not snapshot completeness).

### 4.2 Required files (install / CI gate)

The agent-contract script fails if any of these are missing (must match `REQUIRED_FILES` in [`scripts/check-agent-contract.mjs`](scripts/check-agent-contract.mjs)):

- `AGENTS.md`
- `.cursor/rules/agents-md-mandatory.mdc`
- `.cursor/rules/design-system-enforcement.mdc`
- `.cursor/rules/design-system-docs-enforcement.mdc`
- `.cursor/rules/material-semantics.mdc`
- `.cursor/rules/i18n-directory.mdc`
- `.cursor/rules/lynx-directory.mdc`
- `.cursor/rules/erp-primitives.mdc`
- `.cursor/rules/onething-directory.mdc`
- `.cursor/rules/simulation-directory.mdc`
- `eslint.config.mjs`
- `scripts/check-design-contract.mjs`
- `tests/unit/fixtures-i18n-parity.test.ts`

### 4.3 When checks run

- **preinstall:** `check-agent-contract.mjs`
- **`pnpm lint`:** `lint:agent-contract` → **`lint:drizzle-journal`** → **`lint:fixtures-parity`** → ESLint (**zero warnings**, unused `eslint-disable` reported; includes **radix / base-ui** ban on `lib/features/**`; deep `#features/*/*` ban on `app/`, `components/`, `hooks/`, `lib/**` except `components/ui` and `lib/features`) → `lint:design-contract`
- **CI:** contract scripts, `typecheck`, full `lint`, `format:check`, `build`

### 4.4 Fail-fast summary

- Weakened or missing files in §4.2
- Forbidden root entropy or module-root vocabulary drift
- Cross-module (or invalid) deep feature imports
- Design-contract violations (geometry, palette in primitives, theme variable drift, banned hovers, material drift per `check-design-contract.mjs`)
- **`drizzle/*.sql` ↔ `_journal.json` drift** (missing journal row for a shipped migration, or tag / order mismatch — see **`pnpm lint:drizzle-journal`**)
- **Fixture / catalog drift** — `tests/fixtures/*` out of sync with **`messages/en.json`**, auth shells, seed script, dev sign-in panel, or org audit CSV columns (see **`pnpm lint:fixtures-parity`**)

---

## 5. ERP / full-stack stack (this repo)

- **DB:** Neon Postgres + **Drizzle** — schema in [`lib/db/schema.ts`](lib/db/schema.ts); client in [`lib/db/index.ts`](lib/db/index.ts) (`@neondatabase/serverless` HTTP + **`drizzle-orm/neon-http`**, `fetchOptions.cache: 'no-store'` so Next.js does not cache DB `fetch` round-trips). **Pool vs direct:** use Neon’s **pooled** `DATABASE_URL` (`-pooler` host) at runtime on Vercel/serverless; optional **`DATABASE_URL_UNPOOLED`** (direct endpoint) is preferred by **`drizzle.config.ts`** for migrations when set ([Neon pooling](https://neon.tech/docs/connect/connection-pooling)). **pgvector:** enable with migration `CREATE EXTENSION IF NOT EXISTS vector` (see `drizzle/0004_knowledge_chunk_vector.sql`); org-scoped **`knowledge_chunk`** table + HNSW index for cosine similarity; embeddings via **`lib/features/knowledge`** using **`ai`** + **`@ai-sdk/openai`** (`OPENAI_API_KEY`, optional **`EMBEDDING_MODEL`** — defaults to `text-embedding-3-small` at **1536** dimensions). Prefer Vercel Marketplace Neon + pooled `DATABASE_URL`; run migrations locally with **`pnpm db:migrate:local`** (loads `.env.local`) or **`pnpm db:migrate:vercel`** after **`pnpm env:pull-vercel`**.
- **Auth / IAM:** **Neon Auth** (Better Auth–compatible HTTP API) + **organization** plugin (multi-tenant `activeOrganizationId`). Optional env: **`BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION_ON_INVITATION=1`**; **`ORG_INVITE_MAX_PER_HOUR`** (default **30**, **`0`** = unlimited). **Invite rate limits:** with **`UPSTASH_REDIS_REST_URL`** + **`UPSTASH_REDIS_REST_TOKEN`** (Upstash / Vercel Marketplace) use **@upstash/ratelimit**; otherwise rolling counts on **`iam_audit_event`** — [`org-invite-rate.server.ts`](lib/auth/org-invite-rate.server.ts). **Control plane** lives under [`lib/auth/`](lib/auth/) ([`index.ts`](lib/auth/index.ts) is the public import door for server-side `auth` (starts with **`server-only`** so Client Components must not import **`#lib/auth`** — use **`#lib/auth-client`** and **`#lib/auth/*.shared`** for client-safe symbols); [`neon.server.ts`](lib/auth/neon.server.ts) configures hosted **Neon Auth** via `createNeonAuth`; HTTP surface is `/api/auth/[...path]` (`auth.handler()`). Browser client: [`lib/auth-client.ts`](lib/auth-client.ts) (`@neondatabase/auth/next`). Env: **`NEON_AUTH_BASE_URL`**, **`NEON_AUTH_COOKIE_SECRET`**, **`NEXT_PUBLIC_AUTH_URL`** (full URL ending in `/api/auth`) — [`.env.config.example`](.env.config.example). **Auth interruption semantics:** canonical codes in [`lib/auth/auth-status.shared.ts`](lib/auth/auth-status.shared.ts) (query param `authStatus`), href builder [`lib/auth/auth-interruption-url.shared.ts`](lib/auth/auth-interruption-url.shared.ts), server redirect [`lib/auth/interruption-redirect.server.ts`](lib/auth/interruption-redirect.server.ts), request path capture for RSC guards [`lib/auth/forwarded-path-headers.shared.ts`](lib/auth/forwarded-path-headers.shared.ts) + [`lib/auth/intended-path.server.ts`](lib/auth/intended-path.server.ts), copy resolver [`lib/auth/auth-status-copy.ts`](lib/auth/auth-status-copy.ts), client sign-in error normalization [`lib/auth/auth-client-error.shared.ts`](lib/auth/auth-client-error.shared.ts), UI primitive [`components/auth/auth-result.tsx`](components/auth/auth-result.tsx); locale-scoped examples under **`app/[locale]/…`** (session-expired, verify-email, check-email). **HTTP:** `/api/auth/*`. **Locale-internal pathnames** for links and after locale strip: `/sign-in`, `/account`, `/operator`, `/dashboard`, `/console`, `/accept-invitation`, etc. **Next.js 16** [`proxy.ts`](proxy.ts) applies a **presence-only session cookie** check on those prefixes after intl (see [locale-first application surface](#locale-first-application-surface)); real session and org membership are enforced in RSC / Server Actions. **Session freshness** follows Better Auth [`freshAge`](https://www.better-auth.com/docs/concepts/session-management#session-freshness) (shared constant [`AUTH_SESSION_FRESH_AGE_SECONDS`](lib/auth/session-policy.server.ts)). **Step-up:** [`requireRecentAuthStepUp`](lib/auth/stepup.server.ts) uses `getSession` with `disableCookieCache: true` (see [session management](https://www.better-auth.com/docs/concepts/session-management)) so cookie cache cannot bypass re-auth; missing session → [`AUTH_STATUS.SESSION_EXPIRED`](lib/auth/auth-status.shared.ts), stale session → [`AUTH_STATUS.STEP_UP_REQUIRED`](lib/auth/auth-status.shared.ts), both via [`redirectToAuthInterruption`](lib/auth/interruption-redirect.server.ts) to **`/[locale]/session-expired`** (`app/[locale]/session-expired/page.tsx`; sign-in CTA adds `stepUp=1` for step-up). Sensitive layouts (`/operator`, `/account/security`) call it after role/session guards. **IAM audit:** table [`iamAuditEvent`](lib/db/schema.ts) (`iam_audit_event`); writers in [`lib/auth/audit.server.ts`](lib/auth/audit.server.ts); Better Auth [`hooks`](https://www.better-auth.com/docs/concepts/hooks) for session lifecycle; ERP mutations use `writeIamAuditEvent` per [**IAM audit policy (ERP)**](#iam-audit-policy-erp) below. Apply migrations with `pnpm db:migrate` or `pnpm db:push`. **IAM spine (contract):** identity and session are authoritative in `lib/auth/`; `app/` renders UI only. **Permissions:** org/global checks live in [`lib/auth/permission.server.ts`](lib/auth/permission.server.ts) (`isGlobalAdminUser`, `getOrgMemberRole`, `orgRoleAtLeast`, `canActInOrganization`); [`lib/tenant.ts`](lib/tenant.ts) reuses `isGlobalAdminUser` for `requireGlobalAdminSession`. Session payloads include `user.role` (Better Auth user role) for passing into predicates (see `.cursor/rules/iam-directory.mdc`). **Files / evidence:** **Vercel Blob** is the supported upload path today ([`app/api/upload/blob`](app/api/upload/blob/route.ts)). **S3-compatible (e.g. Cloudflare R2)** is reserved for **archive / long-lived evidence** once IAM audit semantics are stable — do not duplicate Blob for the same use case; see `.env.config.example` section F (S3-compatible placeholders).
- **Tenant guard:** [`lib/tenant.ts`](lib/tenant.ts) — `requireSignedInSession()` for **`/console`** and **`/account`** (validated session, not cookie-only); **`requireOrgSession()`** / **`getOrgTenantContext()`** for ERP (**`activeOrganizationId`** on the session plus a **`neon_auth.member`** row). **`requireOrgSession`** is wrapped in **`React.cache`** (same request dedupe). Route handlers use **`getOrgSessionFromRequest(request)`** (same membership semantics, no redirect). **`requireGlobalAdminSession()`** for **`/operator`**. Session reads use [`lib/session-cache.ts`](lib/session-cache.ts) (`React.cache`).
- **Tenant ID and IDOR:** Treat **`organizationId`** as authoritative **only** when it comes from **`requireOrgSession`**, **`getOrgTenantContext`**, or **`getOrgSessionFromRequest`** — never trust `organizationId` (or org slug) from untrusted **`FormData`**, JSON bodies, or query strings alone. Scope every tenant read/write with that ID. See Next.js [Data Security](https://nextjs.org/docs/app/guides/data-security) (auth inside Server Actions / Route Handlers; Proxy is not sufficient). **`[orgSlug]` params** are validated with **`normalizeOrgSlugParam`** ([`lib/org-slug.shared.ts`](lib/org-slug.shared.ts)) before DB resolution; forwarded pathname tails for cross-tenant redirects are sanitized ([`lib/dashboard-org-path.shared.ts`](lib/dashboard-org-path.shared.ts)).
- **Dashboard paths:** [`lib/dashboard-module-paths.ts`](lib/dashboard-module-paths.ts) — canonical **locale-internal** ERP URLs are **`/o/{orgSlug}/dashboard/...`** (organization slug from the DB; URL-bound tenant check in **`app/[locale]/o/[orgSlug]/layout.tsx`**). Use **`organizationDashboardPath(orgSlug, module)`** with **`Link` / `redirect` from `#i18n/navigation`**. Multi-segment **HRM** URLs under **`/dashboard/hrm/{segment}`** use **`organizationHrmPath`** from **`#features/hrm`** / **`#features/hrm/client`**; forwarded-path sanitization allowlists those segments via **`#lib/hrm-dashboard.shared`** (keep aligned with **`HRM_CAPABILITIES`** — **`tests/unit/hrm-contract.test.ts`**). Legacy **`/dashboard/...`** redirects to the active org’s slug route via **`app/[locale]/dashboard/[[...segments]]/page.tsx`**. Client shell (module nav) imports **`#lib/dashboard-module-paths`** (not feature barrels) to avoid pulling **`server-only`** into the client graph. Server Actions that revalidate ERP modules must call **`revalidatePath(toLocaleOrgDashboardRevalidatePattern("/contacts"), "page")`** (or **`"/knowledge"`**, **`"/lynx"`**, **`"/hrm"`**, **`"/hrm/employees"`**, etc.) so all **`/[locale]/o/[orgSlug]/...`** builds refresh. Non-ERP paths still use **`toLocaleRoutePattern`**. **`callbackUrl`** / post-auth returns stay **locale-prefixed** (`/en/...`); validate with [`resolvePostAuthCallbackUrl`](lib/auth/callback-path.ts).
- **Lynx (machine layer):** [`lib/features/lynx/`](lib/features/lynx/) — ERP **product module** for grounded **Truth Retrieval** (Phase 1) and future Operating Briefs, **Canonical Intake**, and Decision Operator. **NL→SQL demo (org-scoped):** migration **`drizzle/0008_lynx_demo_unicorn.sql`** adds **`lynx_demo_unicorn`**; seed demo rows with **`pnpm lynx:seed-demo <organizationId>`** after migrate. Server Actions (`generateObject` + guarded **`SELECT`** execution + optional Recharts config) implement the Vercel Labs **natural-language-postgres** pattern inside Lynx; audit **`erp.lynx.nl_demo.query`**. **Additional inference modalities** (different SDK/provider patterns: retrieval, structured generation, codegen, visualization helpers, etc.) remain **Lynx** when implemented under **`#features/lynx`** / **`app/api/erp/lynx/*`** with **`erp.lynx.*`** audits—they are **modalities** of one machine layer, not separate “AI” products (see **`.cursor/rules/lynx-directory.mdc`** — _Umbrella_). **`#features/knowledge`** remains the **substrate** (pgvector, `knowledge_chunk`, embeddings); Lynx **composes** it via **`#features/knowledge`** barrel imports only where grounding uses chunks. Streaming HTTP lives under **`app/api/erp/lynx/*`**. **Client Components** and **Nexus / workspace chrome** (`components/nexus/**`, Lynx-owned **`"use client"`** islands under **`lib/features/lynx/components/`**) must not import the main **`#features/lynx`** barrel when doing so would pull **server-only** graphs (`next/headers`, IAM audit writers, RSC-only panels). Import **`#features/lynx/client`** instead — narrow re-exports only (`LYNX_ERP_HTTP_ROUTES`, truth markdown parsing, serializable DTO types). Server composition and routes keep using **`#features/lynx`**. Product lockup **Lynx** + **The Machine**; **Vercel AI SDK** is implementation-only. Stable audit strings and layer ids: **`lynx.contract.ts`** (`erp.lynx.*`). Rule: **`.cursor/rules/lynx-directory.mdc`**. Knowledge substrate rule: **`.cursor/rules/knowledge-directory.mdc`** (adapter purity, retrieval source-blindness, execution boundary, BYOK crypto centralization).
- **Human resources (HRM):** [`lib/features/hrm/`](lib/features/hrm/) — workforce truth module (**Server Actions**, **`organizationId`** guards, **`iam_audit_event`** only — no parallel HR audit table). **Capability registry** **`HRM_CAPABILITIES`** drives **`/dashboard/hrm/{segment}`** routes, nav metadata, and canonical **`erp.hrm.*`** audit prefixes (validated by **`tests/unit/hrm-contract.test.ts`** + **`isAllowedAuditAction`**). **Phase 1A (workforce base):** Drizzle tables **`hrm_job_grade`**, **`hrm_department`**, **`hrm_position`**, **`hrm_employee`** in [`lib/db/schema.ts`](lib/db/schema.ts) (shipped in **`drizzle/0006_mushy_charles_xavier.sql`**); employee CRUD Server Actions write **`erp.hrm.employee.create`**, **`erp.hrm.employee.update`**, **`erp.hrm.employee.archive`** after successful commits; **Phase 1B** adds **`hrm_employment_contract`**, **`hrm_payroll_profile`**, **`hrm_document`**, and **`hrm_employee.currentEmploymentContractId`** (**`drizzle/0010_hrm_contract_payroll_document.sql`**) with audits **`erp.hrm.contract.{create|activate|terminate}`**, **`erp.hrm.payroll_profile.upsert`**, **`erp.hrm.document.attach`**, governed Blob prefixes **`orgs/{organizationId}/hrm/{employeeId}/`** on **`app/api/upload/blob`**, and ingestion adapter **`hrm_payroll_profile_import`**; **Phase 1C** surfaces **`EmployeeTimeline`** on the employee detail page via **`listEmployeeIamAuditTimeline`** (production **`iam_audit_event`** rows for `hrm_employee`, contracts, payroll profiles, and documents — read-only; optional **`audit7w1h`** narrative when metadata includes it). UI routes **`app/[locale]/o/[orgSlug]/dashboard/hrm/employees/page.tsx`** (directory) and **`.../employees/[employeeId]/page.tsx`** (detail); static **`employees/`** tree takes precedence over **`hrm/[segment]`** for the workforce capability; use **`revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/employees"), "page")`** and **`revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/employees/[employeeId]"), "page")`** from workforce mutations ([`ORG_DASHBOARD_HRM_EMPLOYEES`](lib/dashboard-module-paths.ts), [`ORG_DASHBOARD_HRM_EMPLOYEE_DETAIL`](lib/dashboard-module-paths.ts)). **Paths:** module root **`organizationDashboardPath(orgSlug, "hrm")`** or **`organizationHrmRootPath`**; capability tails **`organizationHrmPath(orgSlug, segment)`**; employee detail **`organizationHrmEmployeePath(orgSlug, employeeId)`**. **Forwarded-path sanitization:** **`sanitizePathAfterOrgSlug`** preserves **`/dashboard/hrm/employees/{uuid}`** when the id matches a narrow UUID regex — registry parity for segments remains mandatory via **`#lib/hrm-dashboard.shared`**. **Rule-pack seam:** composable **`PayrollRulePack`** types and **`resolveRulePack`** live under **`#features/hrm/server`** (`data/payroll-rule-pack.server.ts`); implementations ship with payroll phases — **`RULE_PACK_REGISTRY`** starts empty in Phase 0. **Barrels:** **`#features/hrm`** (RSC pages + registry + shell + Zod schemas for tests), **`#features/hrm/client`** (path helpers + **`HRM_CAPABILITIES`** constants + workforce Server Actions for forms), **`#features/hrm/server`** (rule-pack graph). **Product narrative:** [`docs/_draft/hrm-draft-v2.md`](docs/_draft/hrm-draft-v2.md) (engineering draft — tighten there before expanding scope).
- **Vercel (canonical):** Deploy from team **Jack's projects** (`jacks-projects-7b3cfe94`), project name **`afenda-vercel`**. Link with `vercel link --scope jacks-projects-7b3cfe94` (do not rely on hardcoded `prj_*` IDs in docs — use the dashboard or CLI). Do not use duplicate hobby-team projects for production secrets. Optional **Vercel Agent** (dashboard **Settings → AI**) can run automated PR review on security-sensitive diffs (platform feature; no npm package).
- **Files / cron:** Vercel Blob upload [`app/api/upload/blob/route.ts`](app/api/upload/blob/route.ts); daily ERP cron (DB ping + hook for batch work) [`app/api/cron/erp-jobs/route.ts`](app/api/cron/erp-jobs/route.ts) + [`vercel.json`](vercel.json) (crons + favicon/icon CDN `Cache-Control` headers).
- **Env:** Maintainer copy [`.env.config.example`](.env.config.example) → **`.env.config`** (gitignored), fill secrets, run **`pnpm env:sync`** → **`.env.local`** (generated for Next.js + Drizzle; gitignored). Optional: **`pnpm env:pull-vercel`** → `.env.vercel` (gitignored) to diff against Vercel. See [Vercel env CLI](https://vercel.com/docs/cli/env).
- **Observability (five-layer doctrine):** **`lib/logger.server.ts`** is the canonical **structured evidence** log (Pino JSON by default; optional **`LOG_PRETTY=1`** for `pino-pretty` in dev — avoids Turbopack/worker surprises when unset). **`next.config.ts`** sets **`serverExternalPackages`** for **`pino`** / **`pino-pretty`** (matches Next’s recommended externals list). The module is **Node-only** (throws if imported when **`NEXT_RUNTIME === "edge"`**); **`instrumentation.ts`** **`register()`** loads **`instrumentation.node.ts`** on Node only (Next guidance: colocate runtime-specific side effects behind **`NEXT_RUNTIME === "nodejs"`**). **`instrumentation.node.ts`** preloads Pino, **`@vercel/otel`**, and server **Sentry** (`sentry.server.config.ts`). **`instrumentation.ts`** still exports **`onRequestError`** — Node emits Pino + Sentry; Edge loads **`sentry.edge.config`** only and emits one-line JSON + Sentry; use **`error.digest`** to correlate with React-processed server failures. **Sentry** (`@sentry/nextjs`, optional **`instrumentation-client.ts`**) is the **incident inbox** (grouping, releases when source maps upload); **`withSentryConfig`** in `next.config.ts` uploads source maps only when **`SENTRY_AUTH_TOKEN`**, **`SENTRY_ORG`**, and **`SENTRY_PROJECT`** are set. **OpenTelemetry** is the **execution map** — default export from `@vercel/otel` plus **custom spans** via **`lib/otel-span.server.ts`** on **Node only** (custom spans do not run on Edge). **IAM audit** remains the **business truth ledger** — do not replace technical logs or Sentry with `iam_audit_event`. **Operational backstop:** Vercel Runtime Logs / `vercel logs` (e.g. `--level error`, `--status-code 5xx`, deployment compare); cron [`app/api/cron/erp-jobs/route.ts`](app/api/cron/erp-jobs/route.ts) includes a **`observabilityProbe`** field for synthetic DB reachability. Env: **`OTEL_SERVICE_NAME`**, optional **`LOG_LEVEL`**, **`SENTRY_DSN`** / **`NEXT_PUBLIC_SENTRY_DSN`**, sampling vars — see `.env.config.example` §E. Successful **`iam_audit_event`** inserts optionally emit one JSON line per row (`tag`: **`IAM_AUDIT_TELEMETRY_TAG`** in [`lib/auth/iam-audit-telemetry.shared.ts`](lib/auth/iam-audit-telemetry.shared.ts)) — gated by **`AFENDA_IAM_AUDIT_LOG`** / **`VERCEL`**.
- **Runtime errors (Next.js vs Node Pino):** Align with Next.js [error handling](https://nextjs.org/docs/app/getting-started/error-handling): **expected** outcomes (validation, permission denials, routine “not found”) are **return values** or UI state — **do not** spam **`logger.error`** on those paths. **Uncaught** server exceptions are primarily **`instrumentation.ts`** **[`onRequestError`](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation)** (already Pino + Sentry on Node). **Caught** abnormal failures on Node (e.g. Route Handler `catch` after swallowing, or selective Server Actions where external IO fails and the stack would otherwise be lost) should call **`logUnexpectedServerError`** from **`#lib/logger.server`** — merge-object shape **`{ err, ...safeFields }, shortMessage`** so Pino’s **`err`** serializer emits **type / message / stack**. **Edge** bundles and **client** **`error.tsx`** / **`global-error.tsx`** must **not** import **`#lib/logger.server`**; use Edge stderr patterns / Sentry client there.

### Neon + Vercel + pgvector checklist

End-to-end wiring for **Neon** (Postgres + extensions via migrations) and **Knowledge** (`pgvector`) on **Vercel**:

1. **Link CLI (optional):** `vercel link --scope jacks-projects-7b3cfe94` so `vercel env pull` / integration commands target **`afenda-vercel`**.
2. **Provision Neon:** Vercel **Marketplace** → Neon, or **`vercel integration add neon`** ([docs](https://vercel.com/docs/cli/integration)); attach the integration resource to this project so **`DATABASE_URL`** is created for **Production** / **Preview** as needed. Prefer the **pooled** connection string for serverless ([Neon pooling](https://neon.tech/docs/connect/connection-pooling)).
3. **Migrate each database branch** that serves traffic (production Neon branch, and preview branch if previews use a real DB): run **`pnpm db:migrate:local`** with `.env.local` pointing at that branch’s URL, or **`pnpm env:pull-vercel`** then **`pnpm db:migrate:vercel`**. This applies **`CREATE EXTENSION vector`** and **`knowledge_chunk`** (`drizzle/0004_*`), plus **`lynx_demo_unicorn`** when **`drizzle/0008_lynx_demo_unicorn.sql`** is present. For DDL reliability, set **`DATABASE_URL_UNPOOLED`** to Neon’s **direct** (non-pooler) connection string in `.env.local` / Vercel — **`drizzle.config.ts`** uses it automatically when present ([Neon: pooled vs direct](https://neon.tech/docs/connect/connection-pooling)). **Neon Auth V2:** each branch that backs **`DATABASE_URL`** while Auth V2 is on must also have **Neon Auth enabled in the Neon Console** for that branch (creates the **`neon_auth`** schema managed by Neon — not Drizzle). Preview branches created for Vercel may lack **`neon_auth`** and **`vector`** until Auth is enabled and migrations are applied; misaligned branches break **`/api/auth`** and Knowledge embeddings.
4. **Embeddings env on Vercel:** add **`OPENAI_API_KEY`** (and optional **`EMBEDDING_MODEL`**) for **Production** and **Preview** — **`vercel env add`** or dashboard **Settings → Environment Variables** ([Vercel env CLI](https://vercel.com/docs/cli/env)).
5. **Redeploy** so new env vars are visible to builds and serverless functions.
6. **Smoke test:** sign in → **`/{locale}/o/{orgSlug}/dashboard/lynx`** (Truth Retrieval + NL→SQL demo) and **`…/dashboard/knowledge`** (chunk substrate / redirect target) → add chunks → run truth search → migrate + **`pnpm lynx:seed-demo <organizationId>`** → run a structured NL→SQL question on Lynx. **`vercel env run -e production -- next build`** can validate a prod-shaped build with pulled secrets locally ([docs](https://vercel.com/docs/cli/env)).

### Validating with Neon and Vercel MCP

Use Cursor MCP servers declared in [`.cursor/mcp.json`](.cursor/mcp.json) (`neon` → Neon HTTP MCP, `vercel` → Vercel MCP). No secrets belong in repo docs; pass **`projectId`** / **`teamId`** from Neon Console / [`.vercel/project.json`](.vercel/project.json) only inside local MCP sessions.

**Neon MCP (examples):**

- **`describe_project`** — lists branches and IDs for the Neon project tied to this product.
- **`describe_branch`** — shows schema tree per branch; sanity-check **`neon_auth`** vs **`public`** for Auth V2 vs Better Auth.
- **`compare_database_schema`** — pass the **child** branch id (e.g. Vercel preview DB branch) + **`databaseName`** `neondb`; review `diff` for missing extensions (`vector`), Drizzle-owned tables (e.g. **`knowledge_chunk`**, org ingest / integrations tables), and columns present only on the parent (e.g. **`user.lastActiveAt`** after migration `0007`).
- **`run_sql`** — read-only checks such as `SELECT extname FROM pg_extension WHERE extname = 'vector'` and `SELECT nspname FROM pg_catalog.pg_namespace WHERE nspname = 'neon_auth'`.

**Vercel MCP (examples):**

- **`get_project`** — confirm linked **`afenda-vercel`** metadata (`teamId` / `projectId` from [`.vercel/project.json`](.vercel/project.json)): framework, Node version, domains, latest deployment readiness.
- **`search_vercel_documentation`** — e.g. topic **`postgres-url-non-pooling`** or **`Neon Marketplace`** for how **pooled** vs **direct** Postgres URLs map to env vars during integration connect ([REST env schema overview](https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name)).

If MCP shows preview branches **without** `vector` / full `public` migrations / **`neon_auth`**, fix operationally: **`pnpm db:migrate:*`** against that branch’s URLs and enable **Neon Auth** on that branch in the Neon Console — not via ad hoc DDL in application migrations.

### Locale-first application surface

Single narrative for **how users move through the app** (URLs, edge entry, navigation, auth surfaces, resilience):

- **Public URLs** always include the locale segment (`localePrefix: "always"`, e.g. `/en/o/{orgSlug}/dashboard`). Product pages live under **`app/[locale]/…`**. Root [`app/layout.tsx`](app/layout.tsx) reads the forwarded locale header for `<html lang>`.
- **Edge entry:** [`proxy.ts`](proxy.ts) runs **`createIntlMiddleware(routing)`** first, then a **presence-only** Neon Auth session cookie check on **locale-stripped** paths: product prefixes (**`/o`** (org resolver + all tenant paths), `/account`, `/operator`, `/accept-invitation`, `/console`). Legacy **`/{locale}/onboarding`** redirects to **`/{locale}/console`** via **`next.config.ts`** (evaluated before `proxy.ts`). Unauthenticated hits redirect to locale-prefixed **`/sign-in`** with a **`callbackUrl`** that preserves the full path (including locale). Authenticated hits on those paths forward pathname/query headers for RSC interruption redirects. Matcher excludes **`api`**, **`_next`**, **`_vercel`**, **`.well-known/workflow`** (Workflow DevKit internals), and static assets. Pure pathname logic lives in [`lib/auth/proxy-protected-paths.shared.ts`](lib/auth/proxy-protected-paths.shared.ts).
- **`/{locale}/console`** — **post-login loading bay** when the user has **no active org context** or **multiple orgs** ([`ADR-0003`](docs/decisions/0003-post-login-loading-bay-nexus.md)): pending invitations, create-first-org bootstrap (when membership is empty), and multi-org picker with an "Open" link to Nexus. Single-org users are redirected immediately to **`/{locale}/o/{slug}/nexus`**. Protected by the session cookie gate in `proxy.ts`; full RSC guard is **`requireSignedInSession()`** in the layout. Org-switch is audited as **`iam.session.org_switch`**.
- **Navigation:** client islands use **`#i18n/navigation`** with **locale-internal** `href` values (no leading `/{locale}` in code). [`i18n/navigation.tsx`](i18n/navigation.tsx) wraps next-intl’s `Link` with **`prefetch` defaulting to `false`** (less eager prefetch for dynamic RSC segments); pass **`prefetch={true}`** to opt in. Server Components use **`redirect` from `next/navigation`** with [`toLocalePath`](lib/i18n/locales.shared.ts) / [`ensureAppLocale`](lib/i18n/locales.shared.ts). Never emit bare `/o` or `/sign-in` from server redirects, emails, or `callbackUrl` — validate with [`resolvePostAuthCallbackUrl`](lib/auth/callback-path.ts). **Root `app/not-found` / `app/error` / `app/global-error`:** use [`DEFAULT_LOCALE_HOME_PATH`](lib/i18n/root-default-locale-href.shared.ts) with **`next/link`** and **`prefetch={false}`** (outside `[locale]`, `#i18n/navigation` is not mounted). **Path builders and anti-patterns:** **`.cursor/rules/i18n-directory.mdc`**.
- **Auth / marketing UI:** shared framing in [`components/auth/`](components/auth/) (e.g. `auth-page-frame`, `auth-result`). Interruption flows use canonical `authStatus` codes and [`authInterruptionHref`](lib/auth/auth-interruption-url.shared.ts) with an explicit **`AppLocale`**. IAM import boundaries: **`.cursor/rules/iam-directory.mdc`**.
- **Route resilience:** add **`loading.tsx`**, **`error.tsx`**, **`not-found.tsx`**, or **Suspense** where a segment benefits from streaming or graceful failure (checklist: **`.cursor/rules/nextjs-best-practices.mdc`**).

### Nexus runtime (org root)

**Authoritative principles** (future agents must not misunderstand):

```txt
Nexus owns the OS.
Surfaces execute work.
Dashboard chrome is being demoted.
Materials are governed.
Dense ERP remains opaque.
```

- **Definition.** **Nexus** is Afenda's **operational origin field** — the locked HOME of the organization. It is **not** a dashboard, cockpit, or widget board. It answers five questions only: *Where am I? · What context is active? · What matters now? · What requires attention? · Where should I move next?* Customization belongs to the Dock, Utility Bar preferences, and Command shortcuts — **never** to Nexus.
- **Hierarchy.** `Organization` → `NexusShell` (operating environment) → `SurfaceChrome` (local execution tooling) → `Surface` (actual work). Visually: **L1 Utility Bar → Nexus Field (Orientation Band · Operational Pressure · Truth Map · Priority Lanes · Recent Resolution) → L4 Dock**.
- **Routing.** `/{locale}/o/{orgSlug}` redirects to **`/{locale}/o/{orgSlug}/nexus`** ([`app/[locale]/o/[orgSlug]/page.tsx`](app/[locale]/o/[orgSlug]/page.tsx)); the **Nexus Field** renders at [`app/[locale]/o/[orgSlug]/nexus/page.tsx`](app/[locale]/o/[orgSlug]/nexus/page.tsx). `/{locale}/o/{orgSlug}/dashboard/*` **= Surfaces** (existing ERP modules: `ithink`, `contacts`, `lynx`, …). The bare `/dashboard` index is removed; surfaces are reached only by direct URL or via the Nexus Field / Command. **`NexusShell` mounts at [`app/[locale]/o/[orgSlug]/layout.tsx`](app/[locale]/o/[orgSlug]/layout.tsx)** (not `/dashboard/layout.tsx`) so utility / dock / command / Lynx summon **persist across surfaces** without remount — Spatial OS continuity.
- **Module shape.** **`components/nexus/`** owns the runtime (`nexus-shell.tsx`, `nexus-field.tsx`, the five section components, three row primitives, `nexus.types.ts`) — chrome only, no DB, no Server Actions, no tenant business logic. **`lib/features/nexus/`** owns the data layer (one server-shaped **`NexusSnapshot`** per request — not per-widget fetching). Public doors: **`#features/nexus`** (RSC + composition), **`#features/nexus/server`** (`server-only` query graph). Client islands inside Nexus chrome that need types or actions import from **`#features/nexus/client`**.
- **`/dashboard/` route tree vs `components/dashboard/`.** URL segment **`/o/{orgSlug}/dashboard/...`** is only the **App Router tree** for ERP surfaces (`app/[locale]/o/[orgSlug]/dashboard/**`). There is **no** **`components/dashboard/`** directory for org chrome — legacy **`components/dashboard-shell/`** was removed in the Nexus migration. Command palette, Lynx summon, utility bar, dock, and module navigation are **not** duplicated elsewhere; they live **only** under **`components/nexus/`**. Shared surface headers use **`components/module-page-header.tsx`** (and module-owned layouts), not a second shell stack.
- **Material contract.** Nexus is calm by default — `shell` and `opaque` materials carry it. **`cognition`** appears **only when truth is actively resolving** (Lynx assist, critical interruption). Dense ERP lists, tables, and forms remain `opaque`. Material adoption is centralized in [`app/globals.css`](app/globals.css) per [`material-semantics.mdc`](.cursor/rules/material-semantics.mdc) — Nexus components must not introduce inline blur / arbitrary `backdrop-blur-[…]` or duplicated material variables.
- **Layout authority.** Nexus runtime owns: **utility bar · dock · command runtime · material runtime · operator presence · Lynx summon**. **`SurfaceChrome`** (`nexus-surface-chrome.tsx`) wraps skip-link + main landmark + Lynx summon for surfaces that omit full `NexusShell`; product-owned execution chrome (breadcrumbs, surface actions, filters, tabs) still belongs to the surface layout owner when introduced. A surface may **request** cognition / pressure / resolution states; it does **not** define the material engine. Layout geometry rule: **CSS that crosses ownership layers belongs to the nearest layout owner — not the leaf component** ([`frontend-quality-contract.mdc`](.cursor/rules/frontend-quality-contract.mdc) §11).
- **Snapshot contract.** A single server-built **`NexusSnapshot`** carries `org`, `operator`, `readiness`, `surfaces`, `pressure`, `priorityLanes`, `recentResolutions`. **Do not** let Nexus widgets fetch independently — that path leads to dashboard rot at the data layer. Compose ERP truth into the snapshot via **`#features/<module>`** barrels only.
- **Forbidden vocabulary** in product copy / nav / `messages/*`: **dashboard** (as a noun for the org root), **widget**, **module** (user-facing — internal "feature module" stays), **AI mode**, **notification center**, **cockpit**, **home** (as a noun for the org root). Prefer: **Nexus**, **Surface**, **Pressure**, **Resolution**, **Evidence**, **Command**, **Dock**.
- **Migration phases.**
  - **Phase 1 (current):** `NexusShell` mounts at `[orgSlug]/layout.tsx` and absorbs `LynxSummonProvider` / skip-link / `<main>` wrapper — legacy dashboard chrome lifted out of `/dashboard/layout.tsx`. The org URL root redirects to **`/o/{slug}/nexus`** where the **Nexus Field** renders. **`SurfaceChrome`** (`nexus-surface-chrome.tsx`) remains available unmounted for surfaces that need the same minimal stack outside `NexusShell`.
  - **Phase 2:** Nexus-owned slots (`nexus-utility-bar.tsx`, `nexus-dock.tsx`, `nexus-command-layer.tsx`) carry topbar / dock / command; extend **`components/nexus/`** only — legacy **`components/dashboard-shell/`** was removed; **do not** reintroduce **`components/dashboard/`** as parallel shell chrome.
  - **Phase 3:** Optional relocation of execution-layer chrome into `components/surfaces/` (or equivalent); Nexus runtime stays under **`components/nexus/`**.
- **Path builder.** Locale-internal pathname for the Nexus field is **`organizationNexusPath(orgSlug)`** (returns `/o/{slug}/nexus`); the legacy **`organizationDashboardPath(orgSlug, "home")`** alias resolves to the same Nexus URL during Phase 1.

### Auth/IAM route groups (`(auth)` / `(iam)`)

- **`lib/auth/`** owns the **canonical** IAM implementation (Neon `auth`, audit, permissions, org audit, client error normalization, etc.). Locale-first auth/account routes live under `app/[locale]/(auth)/**` (auth flows) and `app/[locale]/(iam)/**` (identity/security/org management); both import **`#lib/auth`** (server) and **`#lib/auth-client`** (client) directly. Auth shell session guards: **`requireAuthShellSignedInSession`**, **`requireAuthShellOrgSession`**, **`requireAuthShellGlobalAdminSession`** (`lib/auth/auth-shell-session.server.ts`). Neon webhook receiver: **`verifyNeonAuthWebhookSignature`** from **`#lib/auth`** (`lib/auth/webhook-verify.server.ts`). User-facing URLs are flat (`/{locale}/sign-in`, `/{locale}/account/*`, `/{locale}/console`, etc.; legacy `/{locale}/onboarding` redirects to `/console`).
- Public doors: **`#lib/auth`** (server, `server-only`) and **`#lib/auth-client`** (client, `"use client"`).
- HTTP: canonical auth proxy is **`/api/auth/[...path]`** (single handler). **`app/api/integrations/neon-auth-webhooks`** receives Neon webhooks.
- Neon-managed schema mirrors belong in **`lib/db/schema-neon-auth.ts`** (`pgSchema("neon_auth")`) for querying only; do not add `neon_auth.*` DDL to Drizzle migrations.
- Do not add duplicate IAM modules anywhere outside `lib/auth/`.

### Operational execution (Workflow DevKit)

- **Role:** [**Workflow DevKit**](https://useworkflow.dev/) (`workflow` package, `withWorkflow` in [`next.config.ts`](next.config.ts)) provides **durable execution only**: retries, batched steps, resumption. It is **not** a product “automation studio,” not a visual builder, and **not** where ERP business rules live.
- **Authority:** **`lib/features/<module>/actions/*`** (Server Actions) remain the **mutation boundary** for ERP and org-admin. **`#features/lynx`** stays **reasoning / advisory** — it does not own durable operational runs or authoritative ledger writes. **`#features/execution`** holds the **cross-cutting contract** ([`execution.contract.ts`](lib/features/execution/execution.contract.ts), stable **`erp.execution.*`** audit strings) and **`enqueueOrgImportJobWorkflowRun`**; workflow entrypoints that must sit beside domain code (e.g. import ingestion) live under the owning module (`lib/features/org-admin/data/import-job-run.workflow.ts`) and are reached via [`import-job-run-entry.ts`](lib/features/execution/data/import-job-run-entry.ts) so **`#features/org-admin`** stays safe for client imports.
- **Triggers:** Runs start from **Server Actions**, **route handlers** (`app/api/*` families per **§6**), **cron**, **webhooks**, or **integrations** — not from arbitrary client-driven graphs. Keep **[`proxy.ts`](proxy.ts)** narrow (session/locale only); do not add workflow business logic there.
- **Tenancy:** Workflow arguments must use **`organizationId`** (and related IDs) **only** from trusted server context after **`requireOrgSession`** / role gates — never from unvalidated client JSON.
- **Audit:** Emit **`erp.execution.*`** lifecycle rows via **`iam_audit_event`** (`metadata` carries **`jobId`** etc.) after successful commits where applicable; align with [**IAM audit policy (ERP)**](#iam-audit-policy-erp). Org-ingestion completion continues to audit **`org.import.job.complete`** from the workflow finalize step.
- **Naming / UX bans:** Avoid **workflow builder**, **AI flows**, **automation studio** in nav and user-facing copy; prefer **runs**, **pipelines**, **execution**, **operational processing**.
- **Explicit backlog — no builder port (early phases):** Do **not** port [**workflow-builder-template**](https://github.com/vercel-labs/workflow-builder-template) (React Flow canvas, plugin graph, “automation studio” UX). **Phase 4–5** criteria from product governance apply before any constrained visual orchestration is reconsidered.

### Operational simulation (scenario replay)

- **Role:** deterministic **operational what-if** runs that persist **real** `onething` rows and **`iam_audit_event`** rows stamped with **`audit_origin = simulation`** (plus `simulation_run_id`, `scenario_id`, `scenario_version`, `simulation_seed`) via **`AsyncLocalStorage`** ([`lib/erp/simulation-context.server.ts`](lib/erp/simulation-context.server.ts)). [`writeIamAuditEvent`](lib/auth/audit.server.ts) merges simulation context automatically; org audit listing/export filter **`production` | `simulation` | `all`** ([`listOrganizationIamAuditEvents`](lib/auth/org-audit.server.ts)).
- **Module:** [`lib/features/simulation/`](lib/features/simulation/) — public **`#features/simulation`**, server composition **`#features/simulation/server`**, constants **`#features/simulation/constants`**. Scenario ids validated by [`scenarioIdSchema`](lib/erp/scenario-types.shared.ts).
- **Gate:** **`AFENDA_ENABLE_SIMULATION=1`** ([`.env.config.example`](.env.config.example)); Server Actions **`replayOrgOperationalScenarioAction`** / **`clearOrgOperationalSimulationRunAction`** and CLI **`pnpm simulate:replay`** / **`pnpm simulate:clear`** refuse otherwise.
- **Audit:** **`org.simulation.scenario.replay`**, **`org.simulation.scenario.clear`**, CSV/stream export toggle audits **`org.governance.export.include_simulated`** (see [**IAM audit policy (ERP)**](#iam-audit-policy-erp)). Admin audit UI uses `?view=simulated|all` against [`parseOrganizationIamAuditOriginFilterParam`](lib/auth/org-audit.server.ts).
- **Rule:** [`.cursor/rules/simulation-directory.mdc`](.cursor/rules/simulation-directory.mdc).

### Operational primitives (Past · Now · Next, CRUD-SAP, 7W1H)

Afenda’s **operational ontology** — shared kernels under `lib/erp/` that every feature module composes (`#lib/erp/temporal-spine.shared`, `#lib/erp/crud-sap.shared`, `#lib/erp/audit-7w1h.shared`, `#lib/erp/audit-7w1h.server`). **Do not invert** the layers below: users experience the product surface; developers compose the temporal spine; architecture enforces internal grammar. `lib/erp/` is primitive-only: no DB schema imports, feature imports, routes, workflows, UI components, or module-specific OneThing behavior.

**Three-layer hierarchy (do not invert)**

```txt
OneThing             — product surface (users)
Past · Now · Next    — composition primitive (developers)
CRUD-SAP + 7W1H      — internal operating grammar + audit shape (architecture)
```

**Pinned doctrine**

```txt
Kernel:    OneThing = consequence + owner + evidence + timing + next-safe-action
Benchmark: A tired finance controller resolves a critical OneThing in 90 seconds.
Lens:      OneThing is a lens, not a module. Sales, accounting, HR, CRM, support,
           inventory, governance, projects all surface OneThings by composing
           #lib/erp/* — never by re-implementing the temporal spine.
```

**Past · Now · Next — runtime contract**

- Types + Zod: [`lib/erp/temporal-spine.shared.ts`](lib/erp/temporal-spine.shared.ts) — `TemporalPast`, `TemporalNow`, `TemporalNext`, `TemporalSpine`, `describeTemporalSpine`, `safeParseTemporal`.
- Runtime: `TemporalObject` with `getPast()` / `getNow()` / `getNext()` plus adapters `asTemporal` and `asTemporalFromColumns` so Lynx, rankers, dashboards, and AI summarisation consume one interface.
- Column convention (when persisting): JSONB facets for Past / Now / Next — use **`temporalPast` / `temporalNow` / `temporalNext`** on Drizzle models to match existing camelCase columns on **`onething`**, or snake_case **`temporal_past` / `temporal_now` / `temporal_next`** on new tables if the migration uses that shape. [`asTemporalFromColumns`](lib/erp/temporal-spine.shared.ts) accepts both, plus legacy ADR **`past_context` / `now_context` / `next_context`** keys for one-off reads.

**CRUD-SAP — invisible operating grammar**

- Canonical verbs (audit / ranker / developer composition only — **never** user-visible labels, nav items, or i18n keys at `*.button` / `*.title` / `*.tab`): `create | resolve | update | deprecate | search | audit | predict`. Use product-domain copy instead (“Resolve”, “Show history”, “What breaks if I approve this?”).
- Strict builder: [`buildCrudSapAuditAction`](lib/erp/crud-sap.shared.ts) for new `erp.<module>.<object>.<verb>` strings. Legacy verbs (`post`, `approve`, `reverse`, `query`, …) stay valid via [`buildErpAuditAction`](lib/erp/crud-sap.shared.ts).

**7W1H — structured audit, natural UI**

- Shape + Zod + natural sentence: [`lib/erp/audit-7w1h.shared.ts`](lib/erp/audit-7w1h.shared.ts) — `AuditEvent7W1H`, `auditEvent7W1HSchema`, `describeAuditEvent7W1H` (sanctioned operator-facing sentence; no `WHO:` / `WHEN:` label grids), `trimAuditCache`.
- IAM composition (server-only): [`lib/erp/audit-7w1h.server.ts`](lib/erp/audit-7w1h.server.ts) — `writeAuditEvent7W1H` wraps [`writeIamAuditEvent`](lib/auth/audit.server.ts) and optional JSONB cache persistence via caller-supplied `cacheUpdater` (the writer does not import `lib/db`).

**Composition recipe (Server Action)**

```ts
import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"
import { writeAuditEvent7W1H } from "#lib/erp/audit-7w1h.server"
import type { AuditEvent7W1H } from "#lib/erp/audit-7w1h.shared"

// After tenant guard + validation: build `event: AuditEvent7W1H`, then:
await writeAuditEvent7W1H({
  event: {
    /* … */ action: buildCrudSapAuditAction({
      area: "erp",
      module: "onething",
      object: "consequence",
      verb: "resolve",
    }),
  },
  iam: {
    actorUserId,
    organizationId,
    resourceType: "onething",
    resourceId,
    metadata: {},
  },
  existingCache: row.audit7w1h,
  cacheUpdater: async (trimmed) => {
    /* tx.update(…).set({ audit7w1h: trimmed }) */
  },
})
```

### Organizational control plane (`/o/{orgSlug}/admin`)

Authoritative narrative for **org-scoped administration** — the workbench is a **capability registry**, not a sidebar app. Routes are derived from the registry; no parallel constants.

- **URL surface:** **`/{locale}/o/{orgSlug}/admin/{section}`** under [`app/[locale]/o/[orgSlug]/admin/`](app/[locale]/o/[orgSlug]/admin/) (overview, members, audit, settings, integrations). Workbench guards (org admin role + step-up + verified email) live in [`app/[locale]/o/[orgSlug]/admin/layout.tsx`](app/[locale]/o/[orgSlug]/admin/layout.tsx). Legacy account-scoped panes (e.g. **`/{locale}/account/organization/audit`**) remain reachable for non-admins; the workbench is the canonical home.
- **Workspace URL slug (`/{locale}/o/{orgSlug}/…`):** Hybrid policy — default slug is derived from the organization name (`lib/org-slug-generate.shared.ts`, validated by `normalizeOrgSlugParam`); users may suggest a slug on onboarding; **`allocateUniqueOrganizationSlug`** in `lib/org-slug.server.ts` enforces reserved tokens + global uniqueness against `neon_auth.organization.slug`. Org admins may rename the slug from **Admin → Settings** (Server Actions `prepareOrganizationSlugAction` / `updateOrganizationSlugAction`, IAM audit **`org.profile.slug.update`**).
- **Module:** [`lib/features/org-admin/`](lib/features/org-admin/) — public door **`#features/org-admin`** ([`index.ts`](lib/features/org-admin/index.ts)). Capabilities are encoded as **filename prefixes** (e.g. **`actions/identity-members.actions.ts`**, **`data/governance-audit.queries.ts`**), never as new sub-folders. Module shape is constrained by **AGENTS §6** + [`scripts/check-agent-contract.mjs`](scripts/check-agent-contract.mjs).
- **Capability registry (single source of truth):** **`ORG_ADMIN_CAPABILITIES`** in [`lib/features/org-admin/constants.ts`](lib/features/org-admin/constants.ts) drives **all** of: allowed segments ([`isAllowedOrgAdminSegment`](lib/features/org-admin/constants.ts) → [`sanitizePathAfterOrgSlug`](lib/dashboard-org-path.shared.ts)), path builder ([`organizationAdminPath`](lib/features/org-admin/constants.ts)), sidebar items ([`buildOrgAdminNav`](lib/features/org-admin/constants.ts) consumed by [`OrgAdminSidebar`](lib/features/org-admin/components/org-admin-sidebar.tsx)), audit prefix per capability, and contract test snapshots ([`tests/unit/org-admin-contract.test.ts`](tests/unit/org-admin-contract.test.ts)). Adding a section means **registering the capability**, then routes/sidebar/sanitizer derive automatically; do **not** duplicate segment lists.
- **Cache invalidation:** Server Actions touching admin surfaces revalidate via **[`toLocaleOrgAdminRevalidatePattern`](lib/i18n/locales.shared.ts)** so all `/[locale]/o/[orgSlug]/admin/...` builds refresh.
- **i18n:** all workbench copy lives under **`OrgAdmin.*`** in [`messages/<locale>.json`](messages/en.json) (`shell`, `nav`, `overview`, `members`, `invite`, `pending`, `memberList`, `audit`, `audit.events`, `client`). Sidebar nav labels resolve via **`OrgAdmin.nav.<navKey>`** with `navKey` enforced by `OrgAdminNavKey` ([`types.ts`](lib/features/org-admin/types.ts)). User-facing copy stays familiar (e.g. **Audit**, **Integrations**) until the post-MVP rebrand listed under **§ Out of scope (rebrand)** in plans.
- **Event taxonomy (canonical prefixes):** **`ORG_ADMIN_EVENT_NAMESPACES`** in [`lib/features/org-admin/constants.ts`](lib/features/org-admin/constants.ts) declares the only allowed prefixes for new audit / outbound delivery / automation event names: **`iam.* | org.* | erp.* | governance.* | integration.* | workflow.* | system.*`**. Existing **`iam.*`**, **`org.*`**, **`erp.*`** stay; new actions must pick one of these and pass [`isAllowedAuditAction`](lib/features/org-admin/constants.ts). Capability ↔ default audit prefix mapping (current registry):

  | Capability id  | Segments       | Audit prefix        |
  | -------------- | -------------- | ------------------- |
  | `identity`     | `members`      | `org.member.*`      |
  | `governance`   | `audit`        | `org.governance.*`  |
  | `integrations` | `integrations` | `org.integration.*` |
  | `organization` | `settings`     | `org.profile.*`     |
  | `operations`   | _(reserved)_   | `org.operations.*`  |

- **Operational ontology (internal language):** code modules / audit names / docs use **identity / governance / integrations / operations / organization** language; user-facing labels stay product-friendly until rebrand.
- **Forbidden:** parallel constants for admin segments outside the registry; deep imports into `lib/features/org-admin/*` from outside the module (use **`#features/org-admin`**); placing admin business logic in `app/[locale]/o/[orgSlug]/admin/*` route files (compose only).

#### Outbound event delivery (`integrations` capability)

- **Tables:** **`org_event_endpoint`** (per-org config — name, url, base64 signing key, JSONB events list, signatureVersion, enabled flag) and **`org_event_delivery`** (one row per attempt — `eventType`, `payloadHash`, `signatureVersion`, lifecycle `state`, attempts, `httpStatus`, `errorMessage`, `durationMs`, `nextAttemptAt`, `completedAt`). Schema: [`lib/db/schema.ts`](lib/db/schema.ts); migration: [`drizzle/0005_org_event_delivery.sql`](drizzle/0005_org_event_delivery.sql).
- **Lifecycle (canonical states):** **`queued | sending | delivered | failed | expired | disabled`** — exposed as **`EVENT_DELIVERY_STATES`** + **`isEventDeliveryState`** in [`lib/features/org-admin/constants.ts`](lib/features/org-admin/constants.ts). Synchronous deliveries still pass through `queued -> sending -> delivered|failed` so future queue/cron implementations can swap behind the same interface.
- **Queue-compatible interface:** [`lib/features/org-admin/data/integrations-delivery.server.ts`](lib/features/org-admin/data/integrations-delivery.server.ts) exports **`enqueueDelivery({ endpoint, signingKey, envelope })`** → `DeliveryHandle` and **`deliverNow(handle)`** → `DeliveryResult`. Today both run in-process; tomorrow `enqueueDelivery` writes to a queue and a worker calls `deliverNow`. Synchronous helper: **`deliverEventNow`** for Server Actions (used by **`pingOrgEventEndpoint`**).
- **Canonical envelope + signing:** **`canonicalJsonStringify`** sorts object keys at every level so **`computePayloadHash`** (sha-256 hex) is reproducible across producers/receivers. Outbound POSTs send headers **`x-afenda-event`**, **`x-afenda-delivery`**, **`x-afenda-payload-hash`**, and **`x-afenda-signature: <signatureVersion>=<hex-hmac-sha256>`** signed with the endpoint's signing key. Current algorithm: **`v1`** = HMAC-SHA256 over the canonical JSON body — bump **`ORG_EVENT_SIGNATURE_VERSION`** when rotating algorithms.
- **Signing-key storage:** column **`signingKeyEncoded`** holds base64url of 32 random bytes. The plaintext is shown **once** in the UI on create/rotate (Server Action returns it; the column is never read by Server Actions other than the delivery pipeline). KMS-backed encryption-at-rest is a follow-up.
- **Event-type allowlist:** **`ORG_EVENT_TYPES`** in [`lib/features/org-admin/constants.ts`](lib/features/org-admin/constants.ts) is the reviewed set of subscribable types. Schema gates: **`eventTypeSchema`** + **`subscribedEventsSchema`** ([`schemas/integrations-event-type.schema.ts`](lib/features/org-admin/schemas/integrations-event-type.schema.ts)) reject anything outside the canonical taxonomy and the registered allowlist; the endpoint form uses checkboxes against this list — no free-text events.
- **Server Actions (Tier B, admin-gated):** [`actions/integrations-endpoints.actions.ts`](lib/features/org-admin/actions/integrations-endpoints.actions.ts) exposes **`createOrgEventEndpoint`**, **`updateOrgEventEndpoint`**, **`deleteOrgEventEndpoint`**, **`rotateOrgEventEndpointSecret`**, **`pingOrgEventEndpoint`**. All five guard with **`requireOrgSession` + `canActInOrganization(..., "admin")`**, write IAM audit events on success, and revalidate via **`toLocaleOrgAdminRevalidatePattern("/integrations")`**. Audit action names: **`org.integration.endpoint.create | update | delete | rotate_secret | ping`**.

#### Organizational ingestion jobs (`integrations` capability)

- **Mental model:** **CSV imports are not "bulk invites" — they are organizational ingestion jobs.** The same primitive will later stage vendors, SKUs, contracts, and policies; member invites are simply the first registered adapter.
- **Tables:** **`import_job`** (per-org job — adapter id, lifecycle `state`, totals, `inputDigest`, `metadata`), **`import_job_row`** (staged input row with parsed `payload`, per-row `state`, optional downstream `resourceType` / `resourceId`), **`import_job_failure`** (per-row or job-level error with `code`, `message`, optional `field`). Schema: [`lib/db/schema.ts`](lib/db/schema.ts); migration: [`drizzle/0006_org_import_jobs.sql`](drizzle/0006_org_import_jobs.sql).
- **Lifecycle (canonical states):** job — **`uploaded | running | completed | failed | cancelled`**; row — **`pending | applied | failed | skipped`**. Synchronous adapters still pass through `uploaded -> running -> completed`; async/queue-backed adapters can park jobs in `uploaded` until a worker picks them up. Constants: **`IMPORT_JOB_STATES`** + **`IMPORT_ROW_STATES`** + **`isImportJobState`** / **`isImportRowState`** ([`constants.ts`](lib/features/org-admin/constants.ts)).
- **Adapter contract:** [`data/import-adapter.server.ts`](lib/features/org-admin/data/import-adapter.server.ts) declares **`OrgImportAdapter<TRow>`** with `id`, `requiredHeaders`, `parseRow(record)` (validation only), and `applyRow(ctx, payload)` (downstream effect). Failure codes: **`validation | rate_limit | duplicate | external_api | permission | unknown`**. Registry: [`data/member-invite.adapter.server.ts`](lib/features/org-admin/data/member-invite.adapter.server.ts) — **`getImportAdapter(id)`** is the lookup. Adding a new adapter requires extending **`OrgImportAdapterId`**, registering in **`IMPORT_ADAPTERS`**, providing a row Zod schema, and (today) wiring the registry inside `getImportAdapter`.
- **First adapter — `member_invite`:** wraps the same Better Auth **`auth.api.createInvitation`** primitive as **`inviteMemberAction`**, including **`assertOrgInviteRateAllowed`** per row. Quotas therefore apply inside ingestion runs too (over-quota rows surface as `code: "rate_limit"` in `import_job_failure`).
- **CSV parser:** [`data/csv-parser.shared.ts`](lib/features/org-admin/data/csv-parser.shared.ts) is dependency-free, supports CRLF/LF, quoted fields, and `""` escapes. Header keys are lower-cased + trimmed; data rows are projected to `Record<string, string>`. Hard limits: **`IMPORT_MAX_CSV_BYTES = 256 KB`**, **`IMPORT_MAX_ROWS_PER_JOB = 500`**. **`digestCsv`** returns the sha-256 hex of the canonical body for **`inputDigest`** idempotency.
- **Server Actions (admin-gated):** [`actions/import-jobs.actions.ts`](lib/features/org-admin/actions/import-jobs.actions.ts) exposes **`createOrgImportJob`** (Tier B — parses CSV, stages rows + validation failures, never applies anything), **`runOrgImportJob`** (Tier A — transitions to **`running`**, audits **`org.import.job.run`**, enqueues [**Workflow DevKit**](https://useworkflow.dev/) apply via **`enqueueOrgImportJobWorkflowRun`**; durable batches in [`import-job-run.workflow.ts`](lib/features/org-admin/data/import-job-run.workflow.ts) transition to **`completed`** and audit **`org.import.job.complete`**), **`cancelOrgImportJob`** (Tier B). All three guard with **`requireOrgSession` + `canActInOrganization(..., "admin")`**, write IAM audit events on success, and revalidate via **`toLocaleOrgAdminRevalidatePattern("/integrations")`**. Audit action names: **`org.import.job.create | run | complete | cancel`**.

Mirror rule: [`.cursor/rules/org-admin-directory.mdc`](.cursor/rules/org-admin-directory.mdc) (globs: `app/[locale]/o/[orgSlug]/admin/**`, `lib/features/org-admin/**`, `messages/*.json`).

### Platform admin surface (`/operator`)

**Mental model:** the global **`/{locale}/operator/*`** surface is a registry-driven sibling of the organization workbench, not a marketing page with a single user list. It is the operator console for cross-tenant identity and platform telemetry. Tenant-scoped governance still lives under **`/o/{orgSlug}/admin`**.

- **URL surface:** **`/{locale}/operator/{section}`** under [`app/[locale]/operator/`](app/[locale]/operator/) (overview, users, organizations). Layout [`app/[locale]/operator/layout.tsx`](app/[locale]/operator/layout.tsx) enforces **`requireGlobalAdminSession()`** + **`requireRecentAuthStepUp`** before rendering.
- **Module:** [`lib/features/platform-admin/`](lib/features/platform-admin/) — public door **`#features/platform-admin`** ([`index.ts`](lib/features/platform-admin/index.ts)). Same shape as `org-admin` (capability filename prefixes, `actions` / `data` / `components` / `schemas` only); cross-tenant logic lives here, never in `app/[locale]/operator/*` route files.
- **Capability registry (single source of truth):** **`PLATFORM_ADMIN_CAPABILITIES`** in [`lib/features/platform-admin/constants.ts`](lib/features/platform-admin/constants.ts) drives nav items ([`PLATFORM_ADMIN_NAV_ITEMS`](lib/features/platform-admin/constants.ts) consumed by [`PlatformAdminSidebar`](lib/features/platform-admin/components/platform-admin-sidebar.tsx)), allowed segments ([`isAllowedPlatformAdminSegment`](lib/features/platform-admin/constants.ts)), path builder ([`platformAdminPath`](lib/features/platform-admin/constants.ts)), audit prefix per capability, and contract test snapshots ([`tests/unit/platform-admin-contract.test.ts`](tests/unit/platform-admin-contract.test.ts)). Adding a section means **registering the capability**, then sidebar/cards/sanitizer derive automatically.
- **Capability ↔ default audit prefix mapping (current registry):**

  | Capability id   | Segments        | Audit prefix         |
  | --------------- | --------------- | -------------------- |
  | `directory`     | `users`         | `iam.user.*`         |
  | `organizations` | `organizations` | `iam.organization.*` |
  | `audit`         | `audit`         | `iam.audit.*`        |
  | `system`        | `system`        | `iam.system.*`       |

- **Users (Tier S, global-admin-gated):** [`actions/users.actions.ts`](lib/features/platform-admin/actions/users.actions.ts) exposes **`setUserRoleAction`**, **`banUserAction`**, **`unbanUserAction`**. Each guards with **`requireGlobalAdminSession()`**, calls Better Auth's admin plugin server API (**`auth.api.setRole | banUser | unbanUser`**), audits as **`iam.user.role.update | iam.user.ban | iam.user.unban`** (no `organizationId`), and revalidates **`toLocaleRoutePattern("/operator/users")`**. Self-targeted ban / role demotion is rejected client-side **and** server-side. Listing uses [`listUsersForPlatformAdmin`](lib/features/platform-admin/data/users.queries.server.ts) which forwards `searchValue` / pagination to Better Auth and projects to a sanitized **`PlatformAdminUserSummary`**.
- **Organizations:** [`listOrganizationsForPlatformAdmin`](lib/features/platform-admin/data/organizations.queries.server.ts) joins **`organization`** + **`member`** for cross-tenant member counts. The page is read-only — destructive org actions remain inside the per-org workbench under tenant-scoped guards.
- **i18n:** all platform-admin copy lives under **`PlatformAdmin.*`** in [`messages/<locale>.json`](messages/en.json) (`shell`, `nav`, `card`, `users`, `organizations`). Sidebar nav labels resolve via **`PlatformAdmin.nav.<navKey>`** with `navKey` enforced by `PlatformAdminNavKey` ([`types.ts`](lib/features/platform-admin/types.ts)).
- **Forbidden:** parallel constants for admin segments outside the registry; deep imports into `lib/features/platform-admin/*` from outside the module (use **`#features/platform-admin`**); cross-tenant mutations in route files (compose only); placing org-scoped actions inside `platform-admin` (those belong in `org-admin`).

### IAM audit policy (ERP)

**Doctrine:** audit **authority changes**, **durable business state changes**, and **irreversible ERP decisions** — not UI-only validation, stubs without DB writes, or noise.

**Rules:**

```txt
No DB write → no iam_audit_event row.
DB write → classify Tier A or Tier B (below).
Security / org membership / IAM changes → always audit when implemented.
```

**Tiers:**

- **Tier S** — Security / tenancy (low volume): org existence, ownership transfers, destructive org actions; often paired with `canActInOrganization(..., "owner")` or global admin flows.
- **Tier A** — Irreversible or compliance-sensitive: posting / finalizing / reversing accounting, period close, irreversible approvals; use **`canActInOrganization(..., "admin")`** (or **`"owner"`** when policy requires) unless product explicitly allows members.
- **Tier B** — Standard durable CRUD and guarded master data: default **`requireOrgSession`**; add **`"admin"`** when master data is admin-guarded.

**Mutation matrix (default gates + audit):**

| Mutation type                      | Gate                                                                                       | Audit      |
| ---------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| Read-only / validation-only        | `requireOrgSession` if route is private                                                    | No         |
| Standard CRUD                      | `requireOrgSession`                                                                        | Tier B     |
| Master data (admin-guarded)        | `requireOrgSession` + `canActInOrganization(..., "admin")`                                 | Tier B     |
| Posting / reversing / finalizing   | `requireOrgSession` + `canActInOrganization(..., "admin")`                                 | Tier A     |
| Ownership / destructive org action | `requireOrgSession` + `canActInOrganization(..., "owner")` (or global admin via predicate) | Tier S / A |

**Action naming (stable strings for reporting):**

```txt
erp.<module>.<object>.<verb>
org.<object>.<verb>
iam.<area>.<verb>
```

Examples: `erp.contact.record.create`, `erp.knowledge.chunk.create`, `erp.execution.import_job.run.started`, `erp.execution.import_job.run.completed`, `erp.execution.import_job.run.failed`, `erp.lynx.truth.query`, `erp.lynx.nl_demo.query`, `erp.lynx.operator.recommend`, `erp.ithink.consequence.create`, `erp.ithink.consequence.update`, `erp.ithink.consequence.resolve`, `erp.ithink.consequence.complete`, `erp.ithink.consequence.snooze`, `erp.ithink.consequence.reopen`, `erp.ithink.consequence.deprecate`, `erp.ithink.consequence.delete`, `erp.ithink.comment.create`, `erp.ithink.attachment.create`, `erp.onething.consequence.create`, `erp.onething.consequence.resolve`, `erp.onething.consequence.update`, `erp.onething.consequence.deprecate`, `erp.onething.consequence.state_transition`, `erp.onething.consequence.prediction_accepted`, `erp.onething.consequence.prediction_cleared`, `erp.hrm.employee.create`, `erp.hrm.employee.update`, `erp.hrm.employee.archive`, `erp.hrm.contract.create`, `erp.hrm.contract.activate`, `erp.hrm.contract.terminate`, `erp.hrm.payroll_profile.upsert`, `erp.hrm.document.attach`, `erp.hrm.leave.request.create`, `erp.hrm.approval.approve`, `erp.hrm.payroll.period.lock`, `erp.sale.order.post`, `erp.purchase.order.approve`, `erp.inventory.stock.reserve`, `erp.accounting.entry.post`, `erp.accounting.entry.reverse`, `org.member.invite`, `org.member.remove`, `org.member.role.update`, `org.invitation.cancel`, `org.invitation.accept`, `org.invitation.reject`, `org.integration.endpoint.create`, `org.integration.endpoint.update`, `org.integration.endpoint.delete`, `org.integration.endpoint.rotate_secret`, `org.integration.endpoint.ping`, `org.import.job.create`, `org.import.job.run`, `org.import.job.complete`, `org.import.job.cancel`, `org.feedback.submit`, `org.feedback.acknowledge`, `org.feedback.resolve`, `org.feedback.reject`, `org.simulation.scenario.replay`, `org.simulation.scenario.clear`, `org.governance.export.include_simulated`, `iam.user.role.update`, `iam.user.ban`, `iam.user.unban`, `iam.session.revoke`, `iam.session.revoke_other`, `iam.session.org_switch`, `iam.passkey.remove`. Session lifecycle remains `iam.session.*` from Better Auth hooks; platform-admin user actions write `iam.user.*` with no `organizationId`. Full **Lynx** audit keys: [`lib/features/lynx/lynx.contract.ts`](lib/features/lynx/lynx.contract.ts).

**Server Action checklist** (aligned with [Next.js Server Actions — auth inside the action](https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/02-guides/authentication.mdx)):

1. Perform real **DB mutation** (stubs that only revalidate: **no** audit).
2. Classify **Tier A / B / S** and choose **`canActInOrganization`** minimum if not member-default.
3. **`requireOrgSession()`** (or stricter) at the start of the action.
4. Call **`writeIamAuditEvent` only after a successful commit**; include `actorSessionId`, `organizationId`, `resourceType`, `resourceId`; keep `metadata` minimal (no secrets / bulk PII).

Implement writers only in `lib/features/<module>/actions/*` via [`writeIamAuditEvent`](lib/auth/audit.server.ts) from [`#lib/auth`](lib/auth/index.ts).

### Postgres row-level security (RLS) — optional compliance layer

When regulatory or threat models require **defense against a forgotten `WHERE organizationId = …`**, add **Postgres RLS** on tenant-scoped tables (e.g. `customers`, **`knowledge_chunk`**, future ERP facts) plus a per-request **`SET LOCAL`** (or transaction-scoped) session variable holding the tenant id, set from the same **`requireOrgSession`** / pool entry path that already gates the app. **Drizzle:** keep schema as today; policies live in SQL migrations alongside Drizzle **`db:push` / `db:migrate`**. **Neon / serverless:** ensure the variable is set on the same connection that runs queries (pool/session pooling patterns — verify with Neon docs for your driver). **Operational note:** RLS complements app-layer guards; it does **not** replace **`requireOrgSession`** or membership checks. Treat RLS rollout as a dedicated migration + performance review (policy predicates on **`organization_id`** indexes).

---

## 6. ERP clean directory engineer contract (required)

### Core philosophy

Build the most complete **reference module** with the smallest stable structure, then force all future modules to follow it.

This prevents:

- Spaghetti architecture
- Random folders
- Architecture drift
- Helper/service/utils explosion

### Golden rule (non-negotiable)

```txt
app/ = routes only
lib/features/ = ERP modules
lib/auth/ = IAM control plane (Better Auth config + shared auth helpers)
lib/db/ = database
lib/erp/ = tiny shared primitives (e.g. temporal-spine.shared, crud-sap.shared, audit-7w1h.{shared,server}, money, pagination)
```

### Repo hygiene objective (mandatory)

This repository is intentionally strict to prevent boundary drift.

- Every change must either:
  - follow the current contract, or
  - update the contract first in this file, then implement.
- "Works locally" is insufficient if boundaries are violated.
- Architectural debt should be paid down continuously: prefer deleting accidental structure over preserving it.

### Root cleanliness policy (mandatory)

Keep repository roots and module roots intentionally clean.

- Do not create generic dumping directories (for example: `tmp/`, `misc/`, `stuff/`, `new/`, `test2/`, `backup/`).
- At repo root, only add new top-level directories when required by framework/platform conventions or this contract.
- At module root (`lib/features/<module>/`), only use approved vocabulary (`actions`, `data`, `components`, `schemas`, `constants.ts`, `types.ts`, `index.ts`).
- If uncertain where a file belongs, place it in the smallest valid existing boundary instead of creating a new folder.

### Canonical directory shape

```txt
app/
  [locale]/
    layout.tsx
    page.tsx
    dashboard/
      [[...segments]]/
        page.tsx
    o/
      [orgSlug]/
        layout.tsx
        page.tsx
        nexus/
          page.tsx
          loading.tsx
        admin/
          layout.tsx
          page.tsx
          members/
            page.tsx
          audit/
            page.tsx
          settings/
            page.tsx
          integrations/
            page.tsx
        dashboard/
          layout.tsx
          page.tsx
          contacts/
            page.tsx
          hrm/
            layout.tsx
            page.tsx
            employees/
              page.tsx
              [employeeId]/
                page.tsx
            [segment]/
              page.tsx
          sale/
            page.tsx
          purchase/
            page.tsx
    sign-in/
    account/
    admin/
    console/
  api/
    auth/
    cron/
    upload/
    webhooks/
    integrations/
lib/
  auth/
    index.ts
    neon.server.ts
    callback-path.ts
    session-policy.server.ts
    stepup.server.ts
    audit.server.ts
    org-audit.server.ts
    org-audit-csv.shared.ts
    org-audit-export-verify.server.ts
    permission.server.ts
  dashboard-module-paths.ts
  features/
    contacts/
      actions/
      data/
      components/
      schemas/
      types.ts
      index.ts
    hrm/
      actions/
        employee.actions.ts
      data/
        employee.queries.server.ts
        payroll-rule-pack.server.ts
      schemas/
        employee.schema.ts
      components/
        add-employee-dialog.tsx
        employee-archive-form.tsx
        employee-create-form.tsx
        employee-detail-page.tsx
        employee-edit-form.tsx
        hrm-nav-sidebar.tsx
        hrm-shell.tsx
        workforce-page.tsx
      constants.ts
      types.ts
      index.ts
      server.ts
      client.ts
    lynx/
      lynx.contract.ts
      actions/
      data/
      components/
      schemas/
      constants.ts
      types.ts
      index.ts
      client.ts
    execution/
      execution.contract.ts
      data/
      schemas/
      index.ts
    simulation/
      constants.ts
      types.ts
      actions/
      data/
      index.ts
      server.ts
      client.ts
    org-admin/
      actions/
      data/
      components/
      schemas/
      constants.ts
      types.ts
      index.ts
      server.ts
      client.ts
  erp/
    money.ts
    pagination.ts
    tenant.ts
  db/
    index.ts
    schema.ts
tests/
  fixtures/
  e2e/
    utils/
  unit/
```

Root tooling (not under `app/` or `lib/`): `vitest.config.ts`, `vitest.setup.ts`, `playwright.config.ts`.

### Contacts is the reference ceiling module

`contacts` defines the maximum ERP module structure.

Other modules may use fewer files/folders, but must not introduce new architectural categories unless this `AGENTS.md` contract is updated first.

### Required module vocabulary

Each ERP module must follow the approved module vocabulary.

Allowed module categories:

- `actions/`
- `data/`
- `components/`
- `schemas/`
- `types.ts`
- `index.ts`
- `constants.ts`
- `server.ts` (optional; see folder semantics)
- `client.ts` (optional; see folder semantics)

`index.ts` is required.

Other folders/files are created only when the module actually uses that category.

`contacts` may contain the full ceiling structure. Smaller modules may contain fewer categories, but must not invent new categories.

Folder semantics:

- `actions/`: Server Actions only (`"use server"`), validation, tenant/org guard, revalidation.
- `data/`: `server-only` DB access, no React/UI/client imports.
- `components/`: ERP module UI only.
- `schemas/`: validation contracts (forms, filters, search).
- `types.ts`: module-local types only.
- `constants.ts`: module-local constants only.
- `index.ts`: primary public import door for Server Components (constants, schemas, async server UI, Server Actions). Do **not** import `index.ts` from Client Components if the module also exports async server panels — use `#features/<module>/client` for narrow types + actions instead. Omit `server-only` query re-exports from `index.ts`; compose those via `#features/<module>/server`.
- `server.ts`: optional **server-only** re-export barrel when `index.ts` must stay client-importable (e.g. org-admin workbench + dashboard shell). Import from Server Components / `server-only` modules only.
- `client.ts`: optional narrow barrel (**types + Server Actions only**) for Client Components that must not import the full `index.ts` graph (which may re-export async server UI).

#### Mandatory import boundary

- Cross-module imports must go through `#features/<module>`, `#features/<module>/client`, or `#features/<module>/server` (never `#features/<module>/data/...`, etc.).
- Deep imports into another module are forbidden except the dedicated `#features/<module>/server` and `#features/<module>/client` surfaces.
- Inside the same module, relative imports are allowed.

Public import rule:

- Allowed: `import { listContactsForOrganization } from "#features/contacts"`
- Allowed (server composition): `import { listOrgImportJobs } from "#features/org-admin/server"`
- Allowed (client islands): `import { switchActiveOrgAction } from "#features/org-admin/client"`
- Forbidden: `import { listContactsForOrganization } from "#features/contacts/data/contacts.queries"`

Enforcement intent:

- If a symbol is needed externally, export it from that module's `index.ts`.
- If not exported intentionally, it is private by design.

Contacts ceiling reference (maximum expected module complexity):

```txt
lib/features/contacts/
  actions/
    create-contact.ts
    update-contact.ts
    archive-contact.ts
    restore-contact.ts
    merge-contacts.ts
    approve-contact.ts
    reject-contact.ts
    import-contacts.ts
    export-contacts.ts
  data/
    contacts.queries.ts
    contacts.mutations.ts
    contacts.selectors.ts
    contacts.cache.ts
  components/
    contacts-page.tsx
    contacts-table.tsx
    contacts-toolbar.tsx
    contacts-filters.tsx
    contact-form.tsx
    contact-detail-panel.tsx
    contact-audit-timeline.tsx
    contact-merge-dialog.tsx
    contact-status-badge.tsx
  schemas/
    contact.schema.ts
    contact-filter.schema.ts
    contact-import.schema.ts
    contact-merge.schema.ts
  constants.ts
  types.ts
  index.ts
```

### Forbidden architecture categories (default ban)

These categories are banned unless this contract is explicitly changed:

```txt
services
managers
helpers
utils
repositories
controllers
hooks
adapters
processors
engines
builders
factories
```

Additional banned patterns:

- `lib/shared/<module-name>/*` as a hidden module mirror
- `app/dashboard/<module>/utils/*` for domain logic
- cross-module "temporary" utility files

### API governance

Default: ERP dashboard CRUD uses **Server Actions**, not REST APIs.

Allowed API families only:

```txt
app/api/auth/*
app/api/cron/*
app/api/upload/*
app/api/webhooks/*
app/api/integrations/*
app/api/erp/<module>/*
```

`app/api/erp/<module>/*` is allowed only for mobile/external/public API/streaming/webhook callback contracts.

`app/api/integrations/*` may host authenticated streaming or integration-shaped endpoints that are not ERP modules (for example, organization IAM audit CSV export) when Server Actions are a poor fit for large binary responses.

Forbidden examples:

```txt
app/api/customers/*
app/api/internal/*
app/api/dashboard/*
app/api/foo/*
```

Mutation policy:

- ERP dashboard mutations: Server Actions first.
- Introducing a new route handler for dashboard CRUD requires explicit justification in PR notes (consumer cannot use Server Actions, or external/public contract is required).

### Shared kernel and DB boundary

- `lib/erp/` must stay tiny and only contain true shared primitives: money, pagination, tenant helpers, audit metadata, shared enums, **Past · Now · Next** ([`lib/erp/temporal-spine.shared.ts`](lib/erp/temporal-spine.shared.ts)), **CRUD-SAP** + **7W1H** ([`lib/erp/crud-sap.shared.ts`](lib/erp/crud-sap.shared.ts), [`lib/erp/audit-7w1h.shared.ts`](lib/erp/audit-7w1h.shared.ts), [`lib/erp/audit-7w1h.server.ts`](lib/erp/audit-7w1h.server.ts)).
- Do not move module workflows into `lib/erp/`.
- Keep DB root in [`lib/db`](lib/db), and only split to `lib/db/schema/<module>.ts` when schema growth justifies it.

Hard rule:

- `lib/erp/` is not a fallback bucket. If code is module-specific, it belongs in that module.

### Anti-spaghetti principle

Stable ERP boundaries are allowed early (`actions`, `data`, `components`, `schemas`), but speculative layers are not.

### Agent checklist before adding ERP features

1. Choose module slug (`contacts`, `sale`, `purchase`, etc.).
2. Place code only inside `lib/features/<module>/...` with the required shape.
3. Export through `index.ts`; never deep-import another module internals.
4. Prefer Server Actions for dashboard mutations.
5. If HTTP is required, stay inside allowed `app/api` families.
6. Apply tenant guard and cache revalidation consistently.

---

## 7. Design system

| Layer                            | Location                                                                                                                                                                       | Notes                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Semantic tokens**              | [`app/globals.css`](app/globals.css) (`:root`, `.dark`)                                                                                                                        | OKLCH palette, elevation, motion, density, surface spacing, `color-scheme`                                                                  |
| **Tailwind bridge**              | [`app/globals.css`](app/globals.css) (`@theme inline`)                                                                                                                         | Every `var(--*)` here must resolve to variables under `:root` / `.dark` (see §4.1)                                                          |
| **Primitive contracts**          | [`lib/design-system.ts`](lib/design-system.ts)                                                                                                                                 | Preferred `ui.*` primitive aliases, allowlisted radii, elevations, density/surface classes, Zod parsers                                     |
| **Primitives**                   | `components/ui/**`                                                                                                                                                             | CVA, `data-slot`, semantic tokens only (no raw palette utilities)                                                                           |
| **Dev overlays**                 | [`components/dev/`](components/dev/)                                                                                                                                           | Gated local tooling UI; semantic Tailwind + **`#lib/design-system`** only — **do not** patch [`app/globals.css`](app/globals.css) for these |
| **Policy & Figma handoff**       | [`docs/design-system/governance.md`](docs/design-system/governance.md), [`.cursor/rules/figma-code-connect-workflow.mdc`](.cursor/rules/figma-code-connect-workflow.mdc) (Code Connect + primitive parity when editing `components/ui` / `lib/design-system.ts`) | Code leads; Figma mirrors code                                                                                                                   |
| **App shell (Nexus runtime)** | [`docs/decisions/0001-afenda-spatial-os-shell.md`](docs/decisions/0001-afenda-spatial-os-shell.md) (Spatial OS — L1–L4 doctrine), [`.cursor/rules/app-shell-directory.mdc`](.cursor/rules/app-shell-directory.mdc) (technical boundary for `components/nexus/**`) | Operational spatial shell (intent → surface → execution → truth); dock + command intent; calm L1 utility band; not feature UI |

**Rules:**

- Import primitives from **`#components/ui/*`** only. **`radix-ui` / `@radix-ui/*` / `@base-ui/react`** are confined to **`components/ui`** (ESLint enforces the same boundary on `lib/features/**`).
- Use **`#lib/design-system`** for preferred `ui.*` primitive aliases, allowlisted geometry, elevation, density/surface helpers, and runtime parsers for untrusted variant payloads. Naming doctrine: **Primitive + intent + state**.
- On filled primary/secondary controls in primitives, use **`bg-primary-hover` / `bg-secondary-hover`**, not **`hover:bg-primary/…`** / **`hover:bg-secondary/…`** (design-contract).
- **Dev-only UI** under [`components/dev/`](components/dev/): ship **only** with explicit gates (`NODE_ENV === "development"` and/or `NEXT_PUBLIC_*` — see `.env.config.example` §H). Style with **existing** token utilities (`bg-card`, `border-border`, `shadow-elevation-*`, etc.) and **`#lib/design-system`** — **do not** add dev-only blocks to [`app/globals.css`](app/globals.css).
- Code / CSS detail: `.cursor/rules/design-system-enforcement.mdc` · design docs: `.cursor/rules/design-system-docs-enforcement.mdc` · dev overlay boundary: `.cursor/rules/dev-directory.mdc`.

---

## 8. Critical Next.js practices (App Router)

**Canonical checklists (always-on in-editor):** **`.cursor/rules/nextjs-best-practices.mdc`** — Server vs client boundaries, async `cookies` / `headers` / `params` / `searchParams`, caching, Server Actions vs Route Handlers, forbidden client patterns, loading/error/Suspense defaults. **`.cursor/rules/frontend-quality-contract.mdc`** — `useEffect` anti-patterns, client import boundaries, ERP state handling, component composition, performance, TypeScript standards, layout geometry ownership (layer doctrine).

**App Router Runtime Doctrine — five dedicated rules (use App Router special files as runtime contracts, not UI conveniences):**

| File            | Afenda meaning         | Rule                                                                                                 |
| --------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `layout.tsx`    | Runtime kernel         | Establish authority, tenant, shell, envelope · **`.cursor/rules/layout-contract.mdc`**               |
| `error.tsx`     | Recovery boundary      | Recover uncaught render/runtime failure · **`.cursor/rules/error-boundaries.mdc`**                   |
| `loading.tsx`   | Waiting contract       | Keep shell visible while page streams · **`.cursor/rules/loading-contract.mdc`**                     |
| `not-found.tsx` | Invalid truth boundary | Show missing org/module/record without destroying shell · **`.cursor/rules/not-found-contract.mdc`** |
| `template.tsx`  | Reset boundary         | Defer unless intentional remount is required · **`.cursor/rules/template-contract.mdc`**             |

**Repo deltas (read with §5 [locale-first surface](#locale-first-application-surface)):**

- **`proxy.ts`** composes **next-intl** + **Better Auth cookie presence**; keep it narrow (no DB, no session body validation). Post-login **`callbackUrl`** must be **locale-prefixed** and validated as same-origin relative paths only ([`resolvePostAuthCallbackUrl`](lib/auth/callback-path.ts)).
- **Product routes** default under **`app/[locale]/…`**; use **`#i18n/navigation`** on the client and **`toLocalePath`** / **`toLocaleRoutePattern`** on the server for redirects and `revalidatePath`.

When framework or platform behavior is uncertain, prefer **Context7** (`/vercel/next.js`) or **Vercel MCP** over stale training data (see [§11](#11-documentation-refresh)).

---

## 9. Repo-specific rules

- **UI / registry:** When editing mirrored registry trees, follow `.cursor/rules/registry-bases-parity.mdc` (if those paths exist in your branch).
- **Images:** [`.cursor/rules/images.mdc`](.cursor/rules/images.mdc) — `next/image`, **`images.localPatterns`** / **`remotePatterns`** in [`next.config.ts`](next.config.ts), SVG defaults, OG image field consistency.
- **Brand assets:** Marks under `public/afenda-brand/` and `public/icons/`; constants in [`lib/site.ts`](lib/site.ts); tab icons + PWA maskable rules in [`app/layout.tsx`](app/layout.tsx); regenerate favicons with **`pnpm icons:favicon`** when the 512 source changes. Full taxonomy, themed tab policy, lockup usage, and change checklist: [`.cursor/rules/brand-assets.mdc`](.cursor/rules/brand-assets.mdc).
- **Developer overlays:** [`components/dev/`](components/dev/) holds **gated** local tooling UI only (not product, not ERP). Server entry components must return **`null`** outside development unless explicitly enabled. Route-error diagnostics: client `error.tsx` reports via `useReportRouteError`; dev-only `RouteErrorDebugPanel` (`components/dev/route-error-debug-panel.tsx`) renders segment + stack + copy-JSON; gated by `NODE_ENV === "development"` + optional `NEXT_PUBLIC_DEV_ERROR_PANEL`. Rule: [`.cursor/rules/dev-directory.mdc`](.cursor/rules/dev-directory.mdc).

---

## 10. Decision protocol when constraints conflict

If speed and architecture safety conflict:

1. Keep boundaries intact.
2. Choose the smallest compliant implementation.
3. Document the trade-off in the PR/commit message.
4. Do not introduce speculative abstractions.

---

## 11. Documentation refresh

When Next.js or platform behavior is uncertain, prefer **Context7** (`/vercel/next.js`) or **Vercel MCP** `search_vercel_documentation` over stale training data.
