# `legal-docs` — three-layer seal (IDE stop sign)

**Status:** DONE · sealed **2026-05-19**  
**Policy:** Do not edit unless the task **explicitly** requires public legal-docs work.

**Cursor rule (auto-loaded on these paths):** `.cursor/rules/legal-docs-directory.mdc`  
**Mechanical guard:** `tests/unit/legal-docs-surface-contract.test.ts`

---

## Locked architecture — one name, three layers

```txt
Layer 1 — app/(main)/[locale]/legal-docs/     → thin re-exports ONLY
Layer 2 — lib/features/legal-docs/            → routing, registry, cache, dispatch (#features/legal-docs)
Layer 3 — components2/legal-docs/             → presentation shells (#components2/legal-docs)
```

**Product name is always `legal-docs`.** Never recreate `public-trust`, `legal-declarations`, or legal-docs UI under `components2/marketing/`.

---

## Layer 1 — this folder (`app/`)

| Allowed | Forbidden |
| --- | --- |
| `page.tsx` re-exports from `#features/legal-docs` | Slug logic, `notFound()`, fetch |
| `unstable_instant` re-export | `#components2/legal-docs` imports |
| This `_SEAL.md` | `loading.tsx`, segment `dynamic`/`revalidate`/`runtime` |
| | Declaration/trust/status JSX |

---

## Layer 2 — `lib/features/legal-docs/`

| Owns | Must not own |
| --- | --- |
| `LegalDocsRoutePage`, metadata, static params | React presentation shells |
| Declaration registry + footer links | `_SEAL.md` at module root (agent-contract violation) |
| OpenStatus cache + trust fixture | Files named `public-trust` / `legal-declarations` |

**No `_SEAL.md` inside `lib/features/legal-docs/`** — module root allowlist rejects it. This file is the human seal for all three layers.

---

## Layer 3 — `components2/legal-docs/`

| Owns | Must not own |
| --- | --- |
| `DeclarationShell`, `TrustControlSurface`, `StatusControlSurface`, `StatusControlSkeleton` | Routing, metadata, OpenStatus fetch |
| Status/trust pills (shared styling) | Dispatch or `notFound()` |

See `components2/legal-docs/_SEAL.md` for Layer 3 inventory.

---

## Verification

```bash
pnpm lint:path -- lib/features/legal-docs components2/legal-docs
pnpm test:fast -- tests/unit/legal-docs-surface-contract.test.ts tests/unit/legal-docs-routing.test.ts tests/unit/legal-docs-declarations-contract.test.ts
pnpm typecheck
```

`pnpm lint:agent-contract` must pass (no forbidden root entries under `lib/features/legal-docs/`).

---

## Unseal criteria

Update only when a named ADR or explicit product decision changes legal-docs architecture.
