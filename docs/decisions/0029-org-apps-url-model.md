# ADR-0029: Org ERP URL model — `/apps/{module}` replaces `/dashboard`

## Status

Accepted — implemented 2026-05-19.

## Context

Org workbench ERP modules lived under `/o/{orgSlug}/dashboard/{module}`, which implied a SPA-style “dashboard root” that no longer exists after the Nexus org OS landing (`/o/{slug}/nexus`). Post-login chrome is owned exclusively by `components2/app-shell` at `o/[orgSlug]/layout.tsx` (ADR-0005, ADR-0003).

## Decision

1. **Canonical module prefix:** `/o/{orgSlug}/apps/{module}` (e.g. `/apps/hrm`, `/apps/contacts`).
2. **Nexus** remains `/o/{orgSlug}/nexus` — not under `apps/`.
3. **Tenant control planes** under the org slug: `/admin`, `/account` only. Afenda **platform console** is `/platform` at locale root (ADR-0031).
4. **Post-login chrome:** one `AppShell` mount at org layout; no `apps/layout.tsx` utility bar; `AppSubLayout` only on modules that need a secondary rail (HRM).
5. **Cutover:** `next.config.ts` permanent wildcard redirect `/:locale/o/:orgSlug/dashboard/:path*` → `/:locale/o/:orgSlug/apps/:path*` (308). No dashboard→apps logic in `proxy.ts`.
6. **Cache Components:** no new segment `dynamic` / `revalidate` exports on app routes; use `toLocaleOrgAppsRevalidatePattern` + `updateTag` in Server Actions (ADR-0023).
7. **Marketplace routes** removed; capability registry data remains in `#features/marketplace/server` for utility-bar resolution until a dedicated utility-catalog module is extracted.

## Consequences

- Path builders: `organizationAppsPath`, `organizationDashboardPath` delegates to apps (deprecated).
- `RouteEnvelope.surface`: `"apps"` replaces `"dashboard"` for ERP module boundaries.
- E2E and fixtures must use `/apps/...` URLs.
- Public Lynx (`/ask-docs`) and ERP Lynx (`/apps/lynx`) remain separate (ADR-0027 public contract).

## References

- ADR-0003 — post-login loading bay / Nexus
- ADR-0005 — workbench shell
- ADR-0026 — metadata-driven UI
- AGENTS.md §5 — tenant routing
