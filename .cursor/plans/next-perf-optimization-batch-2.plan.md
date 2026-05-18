---
name: Next perf optimization batch 2
overview: Shipped — locale loading, account/admin shell prefetch=false, git path audit clean; MCP + pnpm gates green.
todos:
  - id: b2-locale-loading
    content: "DONE: app/[locale]/loading.tsx (LocaleLoading)"
  - id: b2-prefetch-shell
    content: "DONE: account (4) + admin brand→dashboard + top-bar Home + auth-page-frame brand→/ prefetch={false}"
  - id: b2-path-hygiene
    content: "DONE: git ls-files app/ — no backslash duplicate paths; no file moves"
  - id: b2-verify
    content: "DONE: MCP get_errors clean, get_routes app; pnpm lint typecheck test:ci format:check"
---

# Next.js performance optimization — batch 2

## Completed (batch 1 — reference)

| Item | Location |
|------|-----------|
| Account segment loading | [`app/[locale]/account/loading.tsx`](app/[locale]/account/loading.tsx) |
| Admin segment loading | [`app/[locale]/admin/loading.tsx`](app/[locale]/admin/loading.tsx) |
| Nexus module nav prefetch | [`components/nexus/nexus-nav-panel.tsx`](components/nexus/nexus-nav-panel.tsx) `prefetch={false}` |

## Goals (batch 2)

1. Cover the **locale layout boundary** with `loading.tsx` so navigations between major trees under `/{locale}/…` show consistent feedback (today only nested segments have loading; [`app/[locale]/layout.tsx`](app/[locale]/layout.tsx) has no sibling `loading.tsx`).
2. Reduce **eager prefetch** where multiple links target **dynamic / session-heavy** routes from the same shell (same rationale as module nav).
3. Keep **proxy** and **RSC auth** patterns unchanged ([`proxy.ts`](proxy.ts), [`lib/tenant.ts`](lib/tenant.ts)).

## Slice A — `app/[locale]/loading.tsx`

**Add** [`app/[locale]/loading.tsx`](app/[locale]/loading.tsx) mirroring the existing spinner shell:

- Import `Spinner` from `#components/ui/spinner`.
- Same container classes and `aria-busy` / `aria-live="polite"` as org dashboard loading (e.g. [`app/[locale]/o/[orgSlug]/apps/loading.tsx`](app/[locale]/o/[orgSlug]/dashboard/loading.tsx)).
- Short JSDoc: immediate feedback while any direct child segment of `[locale]` suspends.

**Acceptance:** Navigating between top-level locale routes (e.g. home → sign-in) shows the spinner during slow RSC resolution without layout flash regressions.

## Slice B — Prefetch on shell navigation (optional but recommended)

Apply **`prefetch={false}`** only where it matches batch 1 intent (many parallel prefetches to dynamic routes):

| File | Links | Rationale |
|------|--------|-----------|
| [`app/[locale]/account/layout.tsx`](app/[locale]/account/layout.tsx) | Brand → `/dashboard`, Identity, Security, Organization | Three account tabs + dashboard are guarded/dynamic; visible nav bar can trigger multiple prefetches. |
| [`app/[locale]/admin/layout.tsx`](app/[locale]/admin/layout.tsx) | Brand → `/dashboard` | Same pattern as account header. |

**Also applied (conservative prefetch off):**

- Nexus / auth chrome — e.g. [`components/nexus/nexus-control-menu.tsx`](components/nexus/nexus-control-menu.tsx), [`components/auth/auth-page-frame.tsx`](components/auth/auth-page-frame.tsx) — outbound links use `prefetch={false}` where batch 1 applied.
- [`components/auth/auth-page-frame.tsx`](components/auth/auth-page-frame.tsx) — brand → `/` with `prefetch={false}`.

**Do not** disable prefetch on primary CTAs on the marketing page without evidence — balance TTFB vs network chatter.

## Slice C — Path duplication hygiene (conditional)

Git status has historically shown both `app/[locale]/...` and `app\[locale]\...` on Windows. **Audit:**

```bash
git ls-files "app/*locale*" | sort
```

If the same logical files appear under two spellings, **normalize** to the repo’s canonical forward-slash tree and remove duplicates in one commit (no behavior change).

## Verification

1. **Next.js MCP** (dev on port **3000** unless user overrides): `nextjs_index` → `get_errors` (expect empty) → `get_routes` with `{ "routerType": "app" }`.  
   - Note: `nextjs_call` **`args`** must be a **JSON object**, not a stringified JSON string.
2. **Repo gates:** `pnpm lint`, `pnpm typecheck`, `pnpm test:ci`, `pnpm format:check`.

## Non-goals (this batch)

- No new API routes, no proxy logic, no `fetch` in edge.
- No Vitest coverage of `loading.tsx` UI in isolation (keep E2E for full flows per [AGENTS.md](AGENTS.md) testing contract).
- No `loading.tsx` per leaf page where a parent `loading.tsx` already provides adequate UX (avoid spinner nesting noise).

## Execution order

1. Slice A (`[locale]/loading.tsx`).
2. Git audit → Slice C only if duplicates confirmed.
3. Slice B (account + admin layouts first; top-bar/auth-frame only if justified).
4. MCP + pnpm gates.
