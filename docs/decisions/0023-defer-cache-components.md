# ADR-0023 — Defer Cache Components (Next.js 16)

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-16 |
| **Supersedes** | Nothing |
| **Does not supersede** | Next.js 16 App Router, `connection()` for request-time routes, `revalidatePath` / `revalidateTag` for ERP mutations, ask-docs ISR (`generateStaticParams` + segment `revalidate`) |
| **Implements in code** | `next.config.ts` (`cacheComponents` left off), `app/(ask-docs)/**`, `app/llms*.txt`, `app/llms.mdx/**`, `app/api/chat/route.ts` (`connection()`), ~70 ERP/portal/IAM routes retaining `export const dynamic = "force-dynamic"` |
| **Related docs** | [Next.js: cacheComponents](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents) · [Migrating to Cache Components](https://nextjs.org/docs/app/guides/migrating-to-cache-components) · [Caching without Cache Components](https://nextjs.org/docs/app/guides/caching-without-cache-components) · `.cursor/rules/nextjs-best-practices.mdc` |

---

## 1. Context

Next.js 16 introduces **Cache Components** (`cacheComponents: true`): component/function-level caching via `"use cache"`, `cacheLife`, `cacheTag`, and **Partial Prerendering (PPR)** as the default App Router behavior. Segment configs such as `export const dynamic` and `export const revalidate` are replaced when this flag is enabled.

Afenda is a **multi-surface** application:

| Surface | Rendering need |
| ------- | -------------- |
| **ERP / Nexus / org admin** (`/o/{orgSlug}/…`) | Session-bound, tenant-scoped, fresh on every request |
| **Portal** (`/p/{portalSlug}/…`) | Audience-scoped auth, request-time guards |
| **IAM / console** | Post-login bootstrap, org switching |
| **Ask-docs** (`/(ask-docs)/[locale]/ask-docs/…`) | Public, shared MDX — safe to pre-render and revalidate on a schedule |
| **Public Lynx** (`POST /api/chat`) | Streaming, rate-limited, `connection()` at request time |

During ask-docs hybrid work, enabling `experimental.cacheComponents: true` **without** removing legacy `export const dynamic = "force-dynamic"` across the ERP tree caused **global build/runtime failures** (e.g. `llms.txt` and related routes returning 500). The flag was turned off; ask-docs was stabilized with the **previous caching model** documented by Next.js for apps not using Cache Components.

Approximately **70** route files under `app/(main)/` and related trees still export `force-dynamic`. ERP Server Actions already invalidate via `revalidatePath` (locale/org patterns). There is **no measured production pain** on ask-docs TTFB or chat latency that ISR does not already address.

---

## 2. Decision

**Defer enabling Cache Components repo-wide.** Stay on the [Caching and Revalidating (Previous Model)](https://nextjs.org/docs/app/guides/caching-without-cache-components) until a dedicated platform migration meets the triggers in §5.

### 2.1 Configuration

- `next.config.ts`: **`cacheComponents` remains disabled** (commented / omitted).
- Do **not** run automated `enable_cache_components` MCP migration without an explicit platform sprint and regression plan.

### 2.2 Ask-docs (public MDX)

Use **ISR via segment config**, not `"use cache"`:

- `generateStaticParams` for locale × slug pre-render.
- `export const revalidate = 3600` on doc pages and LLM export routes (`llms.txt`, `llms-full.txt`, `llms.mdx/ask-docs/…`).
- Orama search (`/api/ask-docs-search`) and in-memory flexsearch indexes per locale — separate from HTML cache.

On-demand invalidation via `cacheTag('ask-docs:{locale}')` is **not required** while content ships through git deploys (redeploy refreshes static output).

### 2.3 Request-time and dynamic surfaces

- **Route handlers** that must not be statically prerendered: `await connection()` (e.g. `app/api/chat/route.ts`).
- **ERP / portal / IAM**: keep `export const dynamic = "force-dynamic"` until a coordinated removal under Cache Components migration (Next.js: with `cacheComponents`, `force-dynamic` is unnecessary — pages are dynamic by default; removal is a **bulk refactor**, not a docs-only change).

### 2.4 Mutation invalidation

Continue **`revalidatePath`** / **`revalidateTag`** from Server Actions as today. No switch to `updateTag` unless Cache Components is enabled and invalidation semantics are re-audited.

---

## 3. Rationale (YAGNI)

| Cache Components benefit | Afenda need today |
| ------------------------ | ----------------- |
| PPR (static shell + streamed slots) | Ask-docs already pre-renders; ERP is intentionally fully dynamic |
| `cacheLife` instead of `revalidate` | Equivalent hourly ISR already configured |
| `cacheTag` for MDX | Deploy-based content; no live CMS |
| `<Activity>` preserving UI on back-nav | Unrequested; risks ERP form/dialog state surprises |
| Remove `force-dynamic` | **Large migration** (~70 files) with no current defect |

Enabling the flag early is **speculative infrastructure**: high cost, unproven gain on the surfaces we just stabilized.

---

## 4. Consequences

1. **Comments** in ask-docs and `next.config.ts` reference **ADR-0023**, not an open-ended “until Cache Components migration.”
2. **Agents and reviewers** must not enable `cacheComponents` in drive-by PRs; any enablement needs this ADR amended or superseded.
3. **Next.js MCP / docs** remain the source of truth for a future migration ([migrating guide](https://nextjs.org/docs/app/guides/migrating-to-cache-components)).
4. `scripts/strip-force-dynamic-route-exports.mjs` stays a **human-only helper** for a future sprint — not run in CI until the migration is scheduled.

---

## 5. When to revisit (triggers)

Re-open Cache Components when **any** of the following is true:

1. **Platform sprint** scheduled to remove `force-dynamic` repo-wide, add Suspense/`connection()` boundaries for `cookies()` / `headers()` / session, and run full `pnpm verify` + E2E on ERP and portal.
2. **Product requirement** for sub-hour or on-demand ask-docs invalidation without deploy (then adopt `cacheTag` + `revalidateTag` / `updateTag` with `cacheComponents`).
3. **Measured perf gap** on ask-docs (LCP/TTFB) that ISR + CDN cannot fix — profile first, then migrate.

**Migration order** (when triggered):

1. Remove `export const dynamic = "force-dynamic"` where safe (Next.js: default is dynamic).
2. Wrap runtime-only reads in `<Suspense>` or `"use cache: private"` per route.
3. Convert ask-docs `revalidate = 3600` → `'use cache'` + `cacheLife('hours')` only if tag-based invalidation is needed.
4. Enable `cacheComponents: true` in `next.config.ts` when `next build` is clean.

---

## 6. Non-goals

- Enabling Cache Components only for `app/(ask-docs)/` (flag is **global**; incompatible segment exports elsewhere still break the build).
- Replacing ERP `revalidatePath` with Cache Components invalidation in the same change set as ask-docs work.
- Preserving “we’ll migrate later” stubs (`"use cache"` without `cacheComponents`) in production code.
