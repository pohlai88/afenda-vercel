# Org operational surface map (ADR-0026 + ADR-0029 + ADR-0031)

**Canonical ERP prefix:** `/o/{orgSlug}/apps/{module}`. **Nexus:** `/o/{orgSlug}/nexus`.

## Hard cutover doctrine (no code aliases)

| Layer | Rule |
| --- | --- |
| **HTTP** | Legacy `/dashboard/*`, `/marketplace/*`, `/operator/*`, `/o/{slug}/operator/*` → **only** `next.config.ts` permanent redirects |
| **Session redirects** | Legacy `/account/*` → **one** catch-all page (active-org slug); not duplicate route trees |
| **TypeScript** | `#lib/org-apps-module-paths`, `#lib/i18n/org-apps-path.shared`, `platformPath` — no `organizationDashboardPath`, no org-scoped operator paths |
| **RouteEnvelope** | Surfaces: `org`, `apps`, `nexus` (via org layout), `admin`, `platform`, … — no `"dashboard"` or `"marketplace"` |
| **Forwarded paths** | `sanitizePathAfterOrgSlug` normalizes poisoned `/dashboard`, `/marketplace`, `/operator` tails once (not a navigational alias) |

## Runtime validation (Next.js 16 MCP, port 3000)

`get_routes`: ERP leaves under `/[locale]/o/[orgSlug]/apps/*`; **no** `/dashboard/*` or `/marketplace/*` app-router entries.

**Redirects verified:** `/en/o/demo/dashboard/contacts` → `/apps/contacts`; `/marketplace/utilities` → `/nexus`; `/en/operator/users` → `/en/platform/users`.

| Surface | URL | Shell | Metadata |
| --- | --- | --- | --- |
| Nexus | `…/nexus` | `AppShell` @ org layout | Handcrafted |
| ERP | `…/apps/{module}` | `AppShell` | Pattern B/C in HRM; contacts via `ContactsAppsRoutePage` |
| Org admin | `…/admin/*` | `AppSubLayout` | Mixed |
| Org account | `…/account/*` | `AppSubLayout` | Handcrafted |
| Legacy account | `/[locale]/account/*` | Single catch-all redirect → `…/account/*` | — |
| Platform console | `/[locale]/platform/*` | `AppShell` + `AppSubLayout` @ platform layout | Pattern B lists |
| Legacy operator | `/[locale]/operator/*`, `…/operator/*` | HTTP 308 → `/platform/*` | — |
| Marketplace (retired) | — | — | Utility data: `#features/marketplace/server` only |
