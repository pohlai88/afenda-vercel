# ADR-0031: Platform console vs org admin vs portal

## Status

Accepted — implemented 2026-05-19.

## Context

Platform administration (Afenda global admins: user directory, cross-tenant org list, IAM audit) was mounted at `/o/{orgSlug}/operator/*`, which implied tenant-owned ERP chrome and confused **org admin** (customer governance) with **vendor operations** (Afenda team).

## Decision

1. **Canonical platform console:** `/{locale}/platform/*` — `requireGlobalAdminSession`, dedicated `AppShell` layout with platform utility-bar composer, `AppSubLayout` rail from `#features/platform-admin`.
2. **Org admin (tenant):** unchanged at `/o/{orgSlug}/admin/*` — tenant authority overlays, not global admin.
3. **Portals (external audiences):** unchanged at `/p/{portalSlug}/*` — `PortalShell`, not platform.
4. **Legacy URLs:** `next.config.ts` 308 from `/operator/*` and `/o/{orgSlug}/operator/*` to `/platform/*`. No App Router catch-all for operator.
5. **Path builder:** `platformPath(segment?)` in `#features/platform-admin`; `toLocalePlatformRevalidatePattern` for Server Action revalidation.

## Consequences

- Removed `organizationOperatorPath`, `platformAdminPath`, org-scoped operator route tree.
- `RouteEnvelope.surface`: `"platform"` replaces `"operator"` for the vendor console.
- Lynx `/api/erp/lynx/operator` and coordination “operators” API remain unrelated vocabulary.

## References

- ADR-0029 — org ERP URL model
- `docs/architecture/org-operational-surface-map.md`
