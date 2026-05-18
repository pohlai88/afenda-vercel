# ADR-0030: Module client / server barrel boundary

**Status:** Accepted  
**Date:** 2026-05-19  
**Relates to:** [ADR-0026](./0026-metadata-driven-ui-architecture.md) (governed-surface doors), AGENTS.md §6 (module barrels), Next.js [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)

---

## Context

Afenda feature modules expose public doors through `index.ts` (and optional `client.ts` / `server.ts`). The App Router default is **Server Components**. A file marked `"use client"` establishes a **client module graph**: every static import in that graph is bundled for the browser.

**Incident (2026-05):** `gallery-pattern-c-trailing-cell.client.tsx` imported `isListSurfaceTrailingActionRenderable` from `#features/governed-surface` (the server barrel). Evaluating `index.ts` pulled in `GovernedPatternBListSection` → `governed-permission-gate.server.ts` → `#lib/auth` → `audit.server.ts` → `next/headers`. Turbopack reported:

```txt
You're importing a module that depends on "next/headers" … in the Pages Router.
```

The message is misleading; the failure mode is **server-only code inside a client import graph** (environment poisoning per Next.js docs).

Barrel files are especially dangerous: a single named import still **executes the whole barrel module**, including re-exports of server-only RSC sections.

---

## Decision

### Triple door per feature module

| Door | File | Consumers | May contain |
| --- | --- | --- | --- |
| **Server** | `index.ts` | RSC pages, `layout.tsx`, `*.server.ts`, Server Actions | Async server UI, `server-only` data, session/ERP guards |
| **Client** | `client.ts` | `"use client"` modules, `*.client.tsx` | Client components, Zod schemas, pure `.shared.ts` helpers, Server Actions invoked from forms |
| **Server-only graph** | `server.ts` (optional) | Layouts needing heavy server query graphs | `server-only` re-exports only |

**Parallel IAM doors (already enforced):** `#lib/auth` (server) · `#lib/auth-client` (browser).

### Import rules

```txt
Server Components / server modules:
  ✅ #features/<module>          (index.ts)
  ✅ #features/<module>/server
  ❌ Never assume index is safe in "use client" files

Client Components / client modules:
  ✅ #features/<module>/client
  ✅ #features/<module>/schemas/* and *.shared.ts (when ESLint/agent contract allow)
  ✅ Same-module relative imports (../types, ../schemas/…)
  ❌ #features/<module> when index.ts is a server barrel (most ERP modules)
```

### Governed-surface (reference implementation)

After this ADR, `#features/governed-surface/client` exports:

- Client kanban bridges, trailing-action slot, data table
- Zod parsers/types used in dev galleries and client islands
- Pure helpers (`list-surface-trailing-action.shared`, `kanban-card-drop.shared`, …)
- `GovernedEmpty` (uses `#i18n/navigation` only — client-safe)

`#features/governed-surface` remains the server door for `GovernedPatternCListSection`, `GovernedSurface`, builders consumed from RSC, etc.

### Composition (React 19 / Vercel)

- **Push `"use client"` to leaves** — do not import server barrels from client leaves (bundle-size + boundary).
- **Pass Server Components as `children`** — client wrappers must not import RSC sections; slot server-built UI from the parent page.
- **Serializable props only** across the boundary — permissions and tenant truth stay on the server; pass `allowed: boolean`, configuration DTOs, and action references.

---

## Enforcement

| Layer | Mechanism |
| --- | --- |
| ESLint | `afenda/feature-client-server-barrel` on `**/*.client.{ts,tsx}` and `lib/features/**/*.client.{ts,tsx}` — forbids `#features/<module>` without `/client` or `/server` |
| Agent contract | `scripts/check-agent-contract.mjs` — scans client files for server-barrel imports when `index.ts` re-exports `server-only` or `./data/` |
| Docs | `.cursor/rules/module-client-server-barrels.mdc`, AGENTS.md §6 barrels |

---

## Consequences

**Positive**

- Build-time failures instead of subtle auth/headers leakage into client bundles.
- Clear review rule: new client needs → extend `client.ts`, not `index.ts`.
- Aligns with Vercel `bundle-barrel-imports` and composition patterns (explicit client door vs monolithic barrel).

**Negative / discipline**

- Every module with client islands must maintain `client.ts` re-exports (or document a types-only index and keep it free of server re-exports).
- Renderer allowlists that import `#features/governed-surface` stay **server-side** (`kanban-board.renderer.tsx` is RSC) — do not copy those imports into `*.client.tsx`.

---

## Checklist (PRs touching client code)

- [ ] No `#features/<module>` import in `*.client.tsx` unless agent contract marks that module index as client-safe
- [ ] New client-facing symbols exported from `client.ts`
- [ ] Server page composes RSC sections; client island receives props/`children` only
- [ ] `pnpm exec eslint --max-warnings=0 <touched-client-paths>` passes
