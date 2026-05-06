# Agent guide — afenda-vercel

Instructions for AI agents working in this repository. Stack: **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4**, **shadcn/ui**-style components.

**Read first:** `Topology control enforcement (highlight)` in this document. It defines hard tooling gates that fail on boundary and topology violations.

## Commands

- `pnpm dev` — dev server (Turbopack)
- `pnpm build` / `pnpm start` — production build and serve
- `pnpm lint` — agent contract + ESLint + design contract checks
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm format` / `pnpm format:check` — Prettier (Tailwind class sorting via `prettier.config.mjs`)

## Toolchain (aligned with Next.js / Vercel defaults)

- **Node:** `.node-version` / `.nvmrc` → **24** (matches Vercel project default **24.x** and CI); `package.json` **`engines.node`** `>=24.0.0`.
- **pnpm:** **`packageManager`** `pnpm@10.21.0` (lockfile v9); use Corepack or match CI pin.
- **TypeScript:** `tsconfig` — **`target` ES2022**, **`lib` ES2022 + DOM**, **`forceConsistentCasingInFileNames`**, Next `plugins`, `.next/types` includes for **`typedRoutes`**.
- **Next config:** typed **`next.config.ts`** (`NextConfig` from `next`).
- **Drizzle Kit:** `strict` + `verbose` in [`drizzle.config.ts`](drizzle.config.ts).

Path aliases (see `package.json`): `#components/*`, `#lib/*`, `#hooks/*`, `#features/*`.

## ERP / full-stack stack (this repo)

- **DB:** Neon Postgres + **Drizzle** — schema in [`lib/db/schema.ts`](lib/db/schema.ts); client in [`lib/db/index.ts`](lib/db/index.ts).
- **Auth / IAM:** **Better Auth** + **organization** plugin (multi-tenant `activeOrganizationId`). **Control plane** lives under [`lib/auth/`](lib/auth/) ([`index.ts`](lib/auth/index.ts) is the public import door for `auth`; [`config.server.ts`](lib/auth/config.server.ts) holds `betterAuth(...)`). Routes: `/api/auth/*`, product surfaces `/sign-in`, `/account`, `/admin`, `/dashboard`. **Next.js 16** [`proxy.ts`](proxy.ts) on **`/dashboard`**, **`/onboarding`**, **`/account`**, **`/admin`** — **session cookie presence only** (optimistic redirect to `/sign-in?callbackUrl=…`); real session and org membership are enforced in RSC / Server Actions. **Session freshness** follows Better Auth [`freshAge`](https://www.better-auth.com/docs/concepts/session-management#session-freshness) (shared constant [`AUTH_SESSION_FRESH_AGE_SECONDS`](lib/auth/session-policy.server.ts)). **Step-up:** [`requireRecentAuthStepUp`](lib/auth/stepup.server.ts) uses `getSession` with `disableCookieCache: true` (see [session management](https://www.better-auth.com/docs/concepts/session-management)) so cookie cache cannot bypass re-auth; sensitive layouts (`/admin`, `/account/security`) call it after role/session guards. **IAM audit:** table [`iamAuditEvent`](lib/db/schema.ts) (`iam_audit_event`); writers in [`lib/auth/audit.server.ts`](lib/auth/audit.server.ts); Better Auth [`hooks`](https://www.better-auth.com/docs/concepts/hooks) for session lifecycle; ERP mutations use `writeIamAuditEvent` per [**IAM audit policy (ERP)**](#iam-audit-policy-erp) below. Apply migrations with `pnpm db:migrate` or `pnpm db:push`. **IAM spine (contract):** identity and session are authoritative in `lib/auth/`; `app/` renders UI only. **Permissions:** org/global checks live in [`lib/auth/permission.server.ts`](lib/auth/permission.server.ts) (`isGlobalAdminUser`, `getOrgMemberRole`, `orgRoleAtLeast`, `canActInOrganization`); [`lib/tenant.ts`](lib/tenant.ts) reuses `isGlobalAdminUser` for `requireGlobalAdminSession`. Session payloads include `user.role` (Better Auth user role) for passing into predicates (see `.cursor/rules/iam-directory.mdc`). **Files / evidence:** **Vercel Blob** is the supported upload path today ([`app/api/upload/blob`](app/api/upload/blob/route.ts)). **S3-compatible (e.g. Cloudflare R2)** is reserved for **archive / long-lived evidence** once IAM audit semantics are stable — do not duplicate Blob for the same use case; see `.env.config.example` section F (S3-compatible placeholders).
- **Tenant guard:** [`lib/tenant.ts`](lib/tenant.ts) — `requireSignedInSession()` for **`/onboarding`** and **`/account`** (validated session, not cookie-only); `requireOrgSession()` for ERP (org + membership); `requireGlobalAdminSession()` for **`/admin`**. All use cached reads via [`lib/session-cache.ts`](lib/session-cache.ts) (`React.cache`).
- **Dashboard paths:** [`lib/dashboard-module-paths.ts`](lib/dashboard-module-paths.ts) — canonical `/dashboard/...` pathnames. Client shell (e.g. module nav) imports this file instead of `#features/<module>` barrels so Server Component / `server-only` exports are not pulled into the client graph; each module’s `constants.ts` re-exports its route from here.
- **Vercel (canonical):** Deploy from team **Jack's projects** (`jacks-projects-7b3cfe94`), project name **`afenda-vercel`**. Link with `vercel link --scope jacks-projects-7b3cfe94` (do not rely on hardcoded `prj_*` IDs in docs — use the dashboard or CLI). Do not use duplicate hobby-team projects for production secrets.
- **Files / cron:** Vercel Blob upload [`app/api/upload/blob/route.ts`](app/api/upload/blob/route.ts); daily ERP cron (DB ping + hook for batch work) [`app/api/cron/erp-jobs/route.ts`](app/api/cron/erp-jobs/route.ts) + [`vercel.json`](vercel.json).
- **Env:** Maintainer copy [`.env.config.example`](.env.config.example) → **`.env.config`** (gitignored), fill secrets, run **`pnpm env:sync`** → **`.env.local`** (generated for Next.js + Drizzle; gitignored). Optional: **`pnpm env:pull-vercel`** → `.env.vercel` (gitignored) to diff against Vercel. See [Vercel env CLI](https://vercel.com/docs/cli/env).
- **Observability:** root [`instrumentation.ts`](instrumentation.ts) registers **`@vercel/otel`** on the Node server and exports **`onRequestError`** for structured server error logs (digest, path, route type). Optional **`OTEL_SERVICE_NAME`** in env.

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

Examples: `erp.contact.record.create`, `erp.sale.order.post`, `erp.purchase.order.approve`, `erp.inventory.stock.reserve`, `erp.accounting.entry.post`, `erp.accounting.entry.reverse`, `org.member.invite`, `org.member.role.update`. Session lifecycle remains `iam.session.*` from Better Auth hooks.

**Server Action checklist** (aligned with [Next.js Server Actions — auth inside the action](https://github.com/vercel/next.js/blob/v16.1.6/docs/01-app/02-guides/authentication.mdx)):

1. Perform real **DB mutation** (stubs that only revalidate: **no** audit).
2. Classify **Tier A / B / S** and choose **`canActInOrganization`** minimum if not member-default.
3. **`requireOrgSession()`** (or stricter) at the start of the action.
4. Call **`writeIamAuditEvent` only after a successful commit**; include `actorSessionId`, `organizationId`, `resourceType`, `resourceId`; keep `metadata` minimal (no secrets / bulk PII).

Implement writers only in `lib/features/<module>/actions/*` via [`writeIamAuditEvent`](lib/auth/audit.server.ts) from [`#lib/auth`](lib/auth/index.ts).

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
lib/auth/ = IAM control plane (Better Auth config + shared auth helpers)
lib/db/ = database
lib/erp/ = tiny shared primitives
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

### Topology control enforcement (highlight)

These boundaries are enforced by tooling, not just documentation.

- Contract checker: `scripts/check-agent-contract.mjs`
- Install gate: `preinstall` runs contract checks
- Lint gate: `pnpm lint` runs `lint:agent-contract` before ESLint/design checks
- CI gate: GitHub Actions runs contract checks before and after install

What fails fast:

- weakened governance authority files/rules
- forbidden root entropy (unexpected root files/directories in diff)
- forbidden module-root topology drift
- deep feature import boundary violations (cross-module or outside-feature deep imports)

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
  auth/
    index.ts
    config.server.ts
    callback-path.ts
    session-policy.server.ts
    stepup.server.ts
    audit.server.ts
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

#### Mandatory import boundary

- Cross-module imports must go through `#features/<module>` only.
- Deep imports into another module are forbidden.
- Inside the same module, relative imports are allowed.

Public import rule:

- Allowed: `import { listContactsForOrganization } from "#features/contacts"`
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

- `lib/erp/` must stay tiny and only contain true shared primitives: money, pagination, tenant helpers, audit metadata, shared enums.
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

### Pre-merge quality gate for architecture changes

For changes affecting boundaries, modules, routing, or APIs, run:

- `pnpm lint`
- `pnpm typecheck`

Do not mark work as complete if either check fails because of newly introduced issues.

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

- Use root **`proxy.ts`** with a narrow **`matcher`** (this project protects `/dashboard`, `/onboarding`, `/account`, `/admin`).
- **Avoid `fetch` in proxy** unless necessary — latency and Vercel `NO_FETCH_FROM_MIDDLEWARE` rules. Prefer passing **`request.headers`** into auth/session helpers tied to the incoming request.
- **Unauthenticated redirect:** send users to **`/sign-in?callbackUrl=<encoded path+query>`** so post-login return is explicit; validate `callbackUrl` on the sign-in surface (same-origin relative paths only).
- For work that can run after the response, **`waitUntil`** (where supported) can defer logging/analytics.

### Assets and metadata

- Use **`next/image`** for images; remote URLs require configuration (`remotePatterns` / legacy `domains`). Remote images need **`width`**, **`height`**, and meaningful **`alt`**.
- **Repo image policy:** [`.cursor/rules/images.mdc`](.cursor/rules/images.mdc) — local **`images.localPatterns`** (see [`next.config.ts`](next.config.ts)), Vercel Blob **`remotePatterns`**, SVG defaults, and metadata image fields.
- Use **`metadata` / `generateMetadata`** for SEO; OG images via `next/og` / `ImageResponse` when needed.

### Errors and loading UI

- Provide **`error.tsx`**, **`not-found.tsx`**, and **`loading.tsx`** (or Suspense boundaries) where routes need graceful failure and streaming UX.
- Use **`redirect` / `permanentRedirect` / `notFound`** from appropriate server contexts.

### Performance signals

- Consider **Web Vitals** reporting (`next/web-vitals`) for real-user metrics when product requirements need it.

## Repo-specific rules

- **Design system:** Tokens and base typography live in [`app/globals.css`](app/globals.css). Primitive variant/size contracts and allowlisted class literals live in [`lib/design-system.ts`](lib/design-system.ts). Policy, verification, and Figma handoff live in [`docs/design-system/governance.md`](docs/design-system/governance.md) and [`docs/design-system/figma-code-connect-mapping.md`](docs/design-system/figma-code-connect-mapping.md).
- **UI / registry:** When editing mirrored registry trees, follow `.cursor/rules/registry-bases-parity.mdc` (if those paths exist in your branch).
- **Next.js defaults:** See `.cursor/rules/nextjs-best-practices.mdc` for a short in-editor checklist.
- **Images:** Follow [`.cursor/rules/images.mdc`](.cursor/rules/images.mdc). Summary: prefer **`next/image`** with **`alt`** and explicit dimensions (or static import); local **`src`** must match [`next.config.ts`](next.config.ts) **`images.localPatterns`** (`/icons/**`, `/afenda-brand/**`); remote **`src`** must match **`images.remotePatterns`** (Vercel Blob host); extend both when adding new optimized sources. SVG stays unoptimized by default—do not enable **`dangerouslyAllowSVG`** casually. On Vercel, optimization goes through **`/_next/image`**.
- **Brand assets:** Canonical Afenda marks under `public/afenda-brand/` and `public/icons/`. **Two theme systems:** (1) **Browser tab / OS** — `metadata.icons` in [`app/layout.tsx`](app/layout.tsx) uses `media: "(prefers-color-scheme: …)"` with the **same transparent square PNGs** (`APP_ICON_192_PNG` / `APP_ICON_512_PNG`) for light and dark per [Next.js `generateMetadata` icons](https://nextjs.org/docs/app/api-reference/functions/generate-metadata#icons); **`APP_ICON_MASKABLE_512_PNG`** is for the PWA manifest (`purpose: "maskable"`), not the tab `<link rel="icon">` pair. `/favicon.ico` is a **generated multi-size ICO** from the same mark (`pnpm icons:favicon`, see [`lib/site.ts`](lib/site.ts) `FAVICON_ICO` + [`app/layout.tsx`](app/layout.tsx) `icons.shortcut`). (2) **In-app** — `next-themes` + `html.dark`; use Tailwind `dark:` and [`AfendaBrandLockup`](components/afenda-brand.tsx) / [`AfendaBrandIcon`](components/afenda-brand.tsx) as appropriate. Dashboard shell, account layout, and admin layout use the **full lockup** (light/dark PNG pair); OS dark mode and in-app theme can differ. Regenerate **`public/favicon.ico`** with **`pnpm icons:favicon`** when the 512×512 source changes; **do not** swap in an unbranded placeholder ICO or a single `app/icon.png` unless you accept losing themed tab icons. When the mark changes, update [`lib/site.ts`](lib/site.ts), [`.cursor/rules/brand-assets.mdc`](.cursor/rules/brand-assets.mdc), **`metadata.icons`**, and **`images.localPatterns`** for new paths. Details: **brand-assets** rule.

## Decision protocol when constraints conflict

If speed and architecture safety conflict:

1. Keep boundaries intact.
2. Choose the smallest compliant implementation.
3. Document the trade-off in the PR/commit message.
4. Do not introduce speculative abstractions.

## Documentation refresh

When Next.js or platform behavior is uncertain, prefer **Context7** (`/vercel/next.js`) or **Vercel MCP** `search_vercel_documentation` over stale training data.
