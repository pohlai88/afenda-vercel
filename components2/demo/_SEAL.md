# SEAL — Layer 3 · `components2/demo/`

**Product name:** `demo` (public label: Afenda Demo Showcase). [ADR-0041](../../docs/decisions/0041-demo-showcase-three-lanes.md).

## Owns

- `DemoShell`, `DemoBanner`, `DemoSurfaceLayout`, `DemoGuidePanel`, `DemoCatalogCard`

## Does not own

- Fixtures, route manifest, page orchestrators (`lib/features/demo/`)
- Thin routes (`app/.../demo/`)

## Import

`#components2/demo/*` from `lib/features/demo` orchestrators only — not from `app/` route files.
