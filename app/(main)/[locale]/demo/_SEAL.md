# SEAL — Layer 1 · `app/(main)/[locale]/demo/`

**Authority:** Afenda Demo Showcase — public, fixture-backed Product Operating Manual. [ADR-0041](../../../docs/decisions/0041-demo-showcase-three-lanes.md).

**Product name:** `demo` (not `showcase`, `tour`, `sandbox`).

## Three layers

| Layer | Path | Door |
| --- | --- | --- |
| 1 | `app/.../demo/` | Re-export `#features/demo/server` only |
| 2 | `lib/features/demo/` | `#features/demo` · `#features/demo/server` · `#features/demo/client` |
| 3 | `components2/demo/` | `#components2/demo/*` via Layer 2 only |

**No `_SEAL.md` at `lib/features/demo/` root.**

## Enterprise page formula (every demo route)

```txt
DemoShell → DemoBanner → fixture ERP surface → DemoGuidePanel (aside) → Related demos
```

Orchestration: `composeDemoRoutePage` in `lib/features/demo/components/demo-route-page-compose.server.tsx`.

## Routes

| Segment | File |
| --- | --- |
| `/demo` | `page.tsx` → `DemoShowcaseIndexPage` + `generateDemoShowcaseMetadata` |
| `/demo/employee/leave` | `employee/leave/page.tsx` |
| `/demo/hrm/employee-records` | `hrm/employee-records/page.tsx` |
| `/demo/procurement/purchase-request` | `procurement/purchase-request/page.tsx` |
| `/demo/inventory/stock-movement` | `inventory/stock-movement/page.tsx` |
| `/demo/workbench/shell` | `workbench/shell/page.tsx` |

Each leaf exports `default` + `generateMetadata` from `#features/demo/server`.

## Forbidden

- `#lib/db`, session guards, production portal pages with mutations
- `route.ts` under demo
- `#components2/demo` in `page.tsx` files
