# BugBot review contract — Afenda

**Authority:** `AGENTS.md` is the operating contract. This file tells BugBot which classes of violations to flag on every PR. When this file and `AGENTS.md` disagree, follow `AGENTS.md` and fix this file in the same PR.

## Block / strongly flag

Any PR that triggers one of these is a **violation** — comment with the cited rule and request changes.

### 1. Hard-deleted surfaces resurfacing

- Adds **any** file under repo-root `components/` (entire directory is hard-deleted).
- Imports from `#components/...` or filesystem-relative `components/ui/...`.
- Reference: `.cursor/rules/never-restore-deleted-components.mdc`.

### 2. `lib/` root drift

- Adds a new `lib/*.ts` or `lib/*.tsx` that is **not** in `AGENTS.md §6.1` allowlist (`auth-client.ts`, `org-apps-module-paths.ts`, `design-system.ts`, `logger.server.ts`, `session-cache.ts`, `site.ts`, `utils.ts`).
- Reintroduces `lib/tenant.ts` or `#lib/tenant` (retired — use `#lib/auth`).
- Reference: `AGENTS.md §6.1 / §6.2 / §6.3`.

### 3. Cross-module / barrel boundary violations

- Deep-imports across modules: `import … from "#features/<a>/data/..."` from a file inside `#features/<b>`.
- Imports a server barrel (`#features/<module>`) from a file with `"use client"` or named `*.client.tsx` — pulls server graph into the client bundle.
- Reference: `AGENTS.md` Non-negotiable boundaries; `.cursor/rules/module-client-server-barrels.mdc`; ADR-0030.

### 4. Three-layer surface drift (PRIORITY #2)

- Business logic, fetch, slug dispatch, or `generateMetadata` in `app/` (must be a thin re-export only).
- Presentation shells for a product in the wrong `components2/` folder (e.g. `legal-docs` UI inside `marketing/`).
- Sibling parallel feature modules for the same URL tree (e.g. `public-trust` + `legal-declarations` for `/legal-docs`).
- `_SEAL.md` at `lib/features/<module>/` root (rejected by `scripts/check-agent-contract.mjs`).
- Reference: `AGENTS.md PRIORITY #2`; ADR-0035.

### 5. Drizzle ledger destruction (PRIORITY #1)

- Edits to `drizzle/*.sql`, `drizzle/meta/_journal.json`, or `drizzle/meta/*_snapshot.json` by hand.
- Scripts or workflows calling `pnpm db:push`, `pnpm db:push:local`, raw `drizzle-kit push`, or `drizzle-kit migrate` outside the pinned pipeline.
- New `lib/db/schema.ts` change without a single corresponding `drizzle/<NNNN>_*.sql` + matching `_journal.json` entry + new `_snapshot.json`.
- Reference: `AGENTS.md PRIORITY #1`; `.cursor/rules/drizzle-migration-ledger.mdc`; ADR-0032.

### 6. App Router contract violations

- Adds `dynamic`, `revalidate`, or `runtime` segment exports under `app/` (Cache Components doctrine).
- Adds `route.ts` under `app/[locale]/p/**` (portal route handlers forbidden — see `AGENTS.md` portal control plane).
- `error.tsx` files outside the allowlist in `scripts/check-route-error-files.mjs`.
- `proxy.ts` (Next.js 16 edge entry) gains DB calls, business logic, or session-body validation.
- Reference: `.cursor/rules/app-router-contracts.mdc`; `.cursor/rules/nextjs-best-practices.mdc`.

### 7. Locale-first routing violations

- Server-side `redirect("/sign-in")`, `redirect("/o")`, or any non-locale-prefixed path.
- Client `<Link>` from `next/link` instead of `#i18n/navigation`.
- `revalidatePath` against a single concrete locale path (must use `toLocaleRoutePattern` or `toLocaleOrgAppsRevalidatePattern`).
- `callbackUrl` accepted without passing through `resolvePostAuthCallbackUrl`.
- Reference: `.cursor/rules/i18n-directory.mdc`.

### 8. IAM authority violations

- ERP modules using `canActInOrganization(..., "admin")` as the final business authorization (must resolve through `requireErpPermission`).
- `organizationId` trusted from `FormData`, JSON body, or query string instead of `requireOrgSession` / `getOrgTenantContext`.
- New IAM PII keys inside `writeIamAuditEvent*` calls in `lib/features/hrm/` (caught by `afenda/hrm-pii-audit-metadata`).
- Reference: `AGENTS.md §5 IAM audit policy`; `.cursor/rules/iam-directory.mdc`.

### 9. Banned categories / dump dirs

- New directory named `services/`, `managers/`, `helpers/`, `utils/`, `repositories/`, `controllers/`, `hooks/` (except `#hooks/*` aliasable trees that already exist).
- Carve-out: `lib/utils.ts` is the **only** allowed `utils` filename (shadcn `cn()` door).
- Reference: `AGENTS.md` Non-negotiable boundaries.

### 10. Dead code / compatibility shims

- Compatibility redirect or alias to a route or export that no longer exists.
- Stale `// Phase N will …` comment where Phase N already shipped.
- New `// TODO` without owner + issue link.
- Reference: `.cursor/rules/no-dead-code-no-aliases.mdc`; `.cursor/rules/post-task-residue.mdc`.

### 11. React quality blockers

- `useEffect` used for derived state or event side-effects.
- `useFormStatus` called in the same component as its `<form>`.
- `use(fetch(...))` creating a Promise inside render.
- Direct state mutation (`items.push(...); setItems(items)`).
- `key={index}` on dynamic/reorderable business-data lists.
- Reference: `.cursor/rules/frontend-quality-contract.mdc`.

### 12. Public Lynx contract

- Anything under `app/api/chat/`, `components2/ai/search`, or `lib/ask-docs/public-lynx*` imports `#features/lynx` (ERP-only module).
- Vitest script in `package.json` missing `--config .config/vitest.config.ts`.
- Reference: `.cursor/rules/public-lynx.mdc`; `scripts/check-public-lynx-contract.mjs`.

---

## Always cite

Every BugBot comment must cite **either**:

- The exact `AGENTS.md` section (e.g. *AGENTS.md PRIORITY #1*, *AGENTS.md §6.1*), **or**
- The exact `.cursor/rules/*.mdc` path, **or**
- The enforcement script that would catch this in CI (`scripts/check-agent-contract.mjs`, `scripts/check-drizzle-journal.mjs`, etc.).

Without a citation, the comment is noise. With a citation, the author can fix forward immediately.

## Out of scope (do not flag)

- Style / formatting nits (Prettier owns these).
- Unused-disable directives (ESLint owns these).
- Bundle-size warnings under 5 % regression (defer to perf workflow).
- Test coverage drops above the IAM ratchet (defer to coverage gate).
