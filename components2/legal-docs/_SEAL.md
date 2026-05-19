# `components2/legal-docs/` — Layer 3 seal

**Status:** DONE · sealed **2026-05-19**  
**Import door:** `#components2/legal-docs`

Presentation-only shells for `/{locale}/legal-docs/*`. No routing, metadata, registry truth, or OpenStatus fetch.

Full three-layer doctrine: `app/(main)/[locale]/legal-docs/_SEAL.md` · `.cursor/rules/legal-docs-directory.mdc`

---

## Component inventory

| File | Export |
| --- | --- |
| `legal-docs-locale-link.tsx` | `LegalDocsLocaleLink` (locale-prefixed `<a>`, no `headers()`) |
| `declaration-shell.tsx` | `DeclarationShell` |
| `trust-control-surface.tsx` | `TrustControlSurface` |
| `status-control-surface.tsx` | `StatusControlSurface` |
| `status-control-skeleton.tsx` | `StatusControlSkeleton` |
| `legal-docs-status-pill.shared.tsx` | `OpenStatusPill`, `TrustSurfaceStatePill` |

---

## Import boundaries

| May import | Forbidden |
| --- | --- |
| `#components2/ui/*` | OpenStatus loaders, slug routing |
| `#features/legal-docs` (types, constants) | `#components2/metadata` |
| `legal-docs-locale-link.tsx` + `toLocalePath` via explicit `locale` prop | `#i18n/navigation` `Link` (reads `headers()` in RSC) |
| — | Putting these files under `components2/marketing/` |

---

## Verification

```bash
pnpm lint:path -- components2/legal-docs lib/features/legal-docs
pnpm test:fast -- tests/unit/legal-docs-surface-contract.test.ts
```
