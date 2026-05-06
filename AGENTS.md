# Agent guide — afenda-vercel

Instructions for AI agents working in this repository. Stack: **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**-style components.

## Commands

- `pnpm dev` — dev server (Turbopack)
- `pnpm build` / `pnpm start` — production build and serve
- `pnpm lint` — ESLint + design contract check
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm format` / `pnpm format:check` — Prettier (Tailwind class sorting via `prettier.config.mjs`)

## Toolchain (aligned with Next.js / Vercel defaults)

- **Node:** `.node-version` / `.nvmrc` → **24** (matches Vercel project default **24.x** and CI); `package.json` **`engines.node`** `>=24.0.0`.
- **pnpm:** **`packageManager`** `pnpm@9.15.9` (lockfile v9); use Corepack or match CI pin.
- **TypeScript:** `tsconfig` — **`target` ES2022**, **`lib` ES2022 + DOM**, **`forceConsistentCasingInFileNames`**, Next `plugins`, `.next/types` includes for **`typedRoutes`**.
- **Next config:** typed **`next.config.ts`** (`NextConfig` from `next`).
- **Drizzle Kit:** `strict` + `verbose` in [`drizzle.config.ts`](drizzle.config.ts).

Path aliases (see `package.json`): `#components/*`, `#lib/*`, `#hooks/*`, `#features/*`.

## ERP / full-stack stack (this repo)

- **DB:** Neon Postgres + **Drizzle** — schema in [`lib/db/schema.ts`](lib/db/schema.ts); client in [`lib/db/index.ts`](lib/db/index.ts).
- **Auth:** **Better Auth** + **organization** plugin (multi-tenant `activeOrganizationId`), [`lib/auth.ts`](lib/auth.ts), routes under `/api/auth/*`, **Next.js 16** [`proxy.ts`](proxy.ts) for **`/dashboard`** and **`/onboarding`** (session required before the route renders).
- **Tenant guard:** [`lib/tenant.ts`](lib/tenant.ts) `requireOrgSession()` — uses per-request cached session reads via [`lib/session-cache.ts`](lib/session-cache.ts) (`React.cache`). Use for Server Actions and RSC that touch org data.
- **Files / cron:** Vercel Blob upload [`app/api/upload/blob/route.ts`](app/api/upload/blob/route.ts); daily ERP cron (DB ping + hook for batch work) [`app/api/cron/erp-jobs/route.ts`](app/api/cron/erp-jobs/route.ts) + [`vercel.json`](vercel.json).
- **Env:** Maintainer copy [`.env.config.example`](.env.config.example) → **`.env.config`** (gitignored), fill secrets, run **`pnpm env:sync`** → **`.env.local`** (generated for Next.js + Drizzle; gitignored). Optional: **`pnpm env:pull-vercel`** → `.env.vercel` (gitignored) to diff against Vercel. See [Vercel env CLI](https://vercel.com/docs/cli/env).
- **Observability:** root [`instrumentation.ts`](instrumentation.ts) registers **`@vercel/otel`** on the Node server and exports **`onRequestError`** for structured server error logs (digest, path, route type). Optional **`OTEL_SERVICE_NAME`** in env.

## ERP clean directory engineer contract (required)

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
lib/db/ = database
lib/erp/ = tiny shared primitives
```

### Canonical directory shape

```txt
app/
  dashboard/
    contacts/
      page.tsx
    sale/
      page.tsx
    purchase/
      page.tsx
  api/
    auth/
    cron/
    upload/
    webhooks/
    integrations/
lib/
  features/
    contacts/
      actions/
      data/
      components/
      schemas/
      types.ts
      index.ts
  erp/
    money.ts
    pagination.ts
    tenant.ts
  db/
    index.ts
    schema.ts
```

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
- `index.ts`: the only public import door.

Public import rule:

- Allowed: `import { listContactsForOrganization } from "#features/contacts"`
- Forbidden: `import { listContactsForOrganization } from "#features/contacts/data/contacts.queries"`

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

Forbidden examples:

```txt
app/api/customers/*
app/api/internal/*
app/api/dashboard/*
app/api/foo/*
```

### Shared kernel and DB boundary

- `lib/erp/` must stay tiny and only contain true shared primitives: money, pagination, tenant helpers, audit metadata, shared enums.
- Do not move module workflows into `lib/erp/`.
- Keep DB root in [`lib/db`](lib/db), and only split to `lib/db/schema/<module>.ts` when schema growth justifies it.

### Anti-spaghetti principle

Stable ERP boundaries are allowed early (`actions`, `data`, `components`, `schemas`), but speculative layers are not.

### Agent checklist before adding ERP features

1. Choose module slug (`contacts`, `sale`, `purchase`, etc.).
2. Place code only inside `lib/features/<module>/...` with the required shape.
3. Export through `index.ts`; never deep-import another module internals.
4. Prefer Server Actions for dashboard mutations.
5. If HTTP is required, stay inside allowed `app/api` families.
6. Apply tenant guard and cache revalidation consistently.

## Critical Next.js practices (App Router)

Sourced from **Vercel documentation** (via MCP) and **Next.js v16 docs** (Context7 `/vercel/next.js/v16.1.6`). Treat these as non-negotiable defaults.

### Server vs client

- **Default to Server Components.** Add `'use client'` only for interactivity: state, effects, event handlers, or browser-only APIs.
- **Composition:** Prefer passing **server-rendered content as `children`** (or other `ReactNode` props) into small client wrappers instead of turning large trees into client components.
- **Server Actions:** Define mutations in modules with `'use server'` (top of file or per function). Invoke from forms (`action` / `formAction`) or import into client components as needed.

### Async request APIs (Next 15+)

- **`cookies()` and `headers()`** from `next/headers` are async: use `const store = await cookies()` (same for `headers()`).
- **`params` and `searchParams`** in `page`, `layout`, and `generateMetadata` are **Promises** — `await` them (or use `React.use()` where applicable). Typing: e.g. `params: Promise<{ slug: string }>`.

Using `searchParams` (and other dynamic APIs) opts the route into **dynamic rendering**; expect cache behavior to match the caching docs.

### Data fetching and caching

- **Avoid waterfalls:** parallelize independent work (`Promise.all`, split Server Components, or `preload` patterns).
- **`fetch`:** use `next: { revalidate: seconds }` for time-based ISR-style behavior; use `next: { tags: ['tag'] }` for tag-based invalidation.
- **On-demand revalidation:** after mutations, call `revalidateTag('tag', 'max')` from Server Actions or Route Handlers (stale-while-revalidate profile `'max'` is recommended where supported).
- **Route segment:** `export const revalidate = N` applies to the segment’s static cache lifetime where appropriate.

### Route Handlers vs Server Actions

- **Route Handlers** (`app/**/route.ts`): HTTP APIs, webhooks, non-React clients, file uploads, integrations.
- **Server Actions:** form posts and mutations from the React tree; keep auth and validation on the server.

### Proxy / edge routing (Next.js 16)

- Use root **`proxy.ts`** with a narrow **`matcher`** (this project protects `/dashboard`).
- **Avoid `fetch` in proxy** unless necessary — latency and Vercel `NO_FETCH_FROM_MIDDLEWARE` rules. Prefer passing **`request.headers`** into auth/session helpers tied to the incoming request.
- For work that can run after the response, **`waitUntil`** (where supported) can defer logging/analytics.

### Assets and metadata

- Use **`next/image`** for images; remote URLs require configuration (`remotePatterns` / legacy `domains`). Remote images need **`width`**, **`height`**, and meaningful **`alt`**.
- Use **`metadata` / `generateMetadata`** for SEO; OG images via `next/og` / `ImageResponse` when needed.

### Errors and loading UI

- Provide **`error.tsx`**, **`not-found.tsx`**, and **`loading.tsx`** (or Suspense boundaries) where routes need graceful failure and streaming UX.
- Use **`redirect` / `permanentRedirect` / `notFound`** from appropriate server contexts.

### Performance signals

- Consider **Web Vitals** reporting (`next/web-vitals`) for real-user metrics when product requirements need it.

## Repo-specific rules

- **UI / registry:** When editing mirrored registry trees, follow `.cursor/rules/registry-bases-parity.mdc` (if those paths exist in your branch).
- **Next.js defaults:** See `.cursor/rules/nextjs-best-practices.mdc` for a short in-editor checklist.

## Documentation refresh

When Next.js or platform behavior is uncertain, prefer **Context7** (`/vercel/next.js`) or **Vercel MCP** `search_vercel_documentation` over stale training data.
