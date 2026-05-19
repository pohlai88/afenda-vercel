# ADR-0035 — Three-layer surface contract and IDE anti-drift (PRIORITY #2)

**Status:** Accepted  
**Date:** 2026-05-19  
**Relates to:** **AGENTS.md PRIORITY #2** · `.cursor/rules/legal-docs-directory.mdc` · `.cursor/rules/app-router-contracts.mdc` · `scripts/check-agent-contract.mjs` · `tests/unit/legal-docs-surface-contract.test.ts`

---

## Context

Afenda uses a **server-first App Router** stack. Product surfaces must live in **three explicit layers**:

```txt
Layer 1 — app/                 → routes, thin re-exports, seals at route group
Layer 2 — lib/features/<name>/ → domain truth, routing, cache, dispatch, registry
Layer 3 — components2/<name>/  → presentation shells (paint only)
```

**IDE / agent drift is the primary failure mode.** Cursor and other agents:

| Drift pattern | Damage |
| --- | --- |
| Invent parallel module names (`public-trust`, `legal-declarations`) for one URL tree (`legal-docs`) | Humans cannot find code; imports fork; tests lie |
| Put fetch/dispatch/metadata in `app/` “because the page needs it” | Violates App Router contract; blocks Cache Components tiers |
| Put presentation shells in `components2/marketing/` or wrong feature folder | Layer 3 boundary breaks; marketing becomes a dump dir |
| Add `_SEAL.md` under `lib/features/<module>/` | **`check-agent-contract` hard failure** — not an allowed module root entry |
| “Temporary” shims instead of deleting retired paths | `no-dead-code-no-aliases.mdc` violation; ghost surfaces in route discovery |

**Legal-docs incident (2026-05-19):** one product surface was split across `public-trust`, `legal-declarations`, and `components2/marketing/` until consolidated to **`legal-docs`** everywhere. Operator anger was justified — the IDE optimized for local convenience, not discoverability.

**Why rules alone fail:**

| Gap | Effect |
| --- | --- |
| No PRIORITY block in AGENTS.md | Agents treat layering as style, not block-merge law |
| No ADR | “Why one name” is not durable across sessions |
| Feature `_SEAL.md` at module root | Passes human review, fails agent-contract |
| Glob rules not loaded | Agent edits `app/` without reading Layer 2/3 doctrine |

---

## Decision

### PRIORITY #2 — one product name, three layers; IDE must not drift

```txt
YOU (IDE / agent) keep one product name across app/, lib/features/, and components2/.
YOU do not invent sibling modules, marketing dumps, or app-layer business logic.
YOU do not add _SEAL.md under lib/features/<module>/ roots.

When in doubt: routes stay thin, features own truth, components own paint.
Read the surface rule BEFORE editing (legal-docs-directory.mdc, iam-profile-directory.mdc, iam-directory.mdc, …).
```

### Layer ownership (hard)

| Layer | Path pattern | Owns | Must not own |
| --- | --- | --- | --- |
| **1** | `app/(main)/[locale]/…` | `page.tsx` re-exports, route `_SEAL.md`, locale params wiring | Fetch graphs, slug dispatch, registry, JSX shells |
| **2** | `lib/features/<name>/` (auth: `lib/auth/`) | Registry, metadata, guards wiring *into* feature, cache, Server Actions, RSC page bodies | React presentation shelves, `_SEAL.md` at module root |
| **3** | `components2/<name>/` | Card/shell/layout JSX, client islands for that surface | OpenStatus fetch, `notFound()`, `generateMetadata` |

**Public doors only:** `#features/<name>`, `#components2/<name>` (or documented barrels). No cross-layer deep imports that pull server graphs into client bundles.

**Auth exception:** pre-login auth Layer 2 is `lib/auth/` (IAM control plane), not `lib/features/auth/`. Same three-layer *shape* applies; only the Layer 2 path differs.

### Sealed surfaces (reference implementations)

| Surface | Layer 1 | Layer 2 | Layer 3 | Rule |
| --- | --- | --- | --- | --- |
| Pre-login auth | `(auth)/` | `lib/auth/` (IAM control plane — not `lib/features/`) | `components2/auth/` | `iam-directory.mdc` |
| Legal-docs / trust | `legal-docs/` | `lib/features/legal-docs/` | `components2/legal-docs/` | `legal-docs-directory.mdc` |
| IAM profile | `o/…/iam-profile/` | `lib/features/iam-profile/` | `components2/iam-profile/` | `iam-profile-directory.mdc` |

New public surfaces **must** follow the same three-layer shape and get a `*-directory.mdc` rule in the same PR.

### Legal-docs — canonical names (do not rename again)

```txt
#features/legal-docs          ← Layer 2 only door
#components2/legal-docs       ← Layer 3 only door
app/.../legal-docs/page.tsx   ← re-exports from #features/legal-docs only
```

**Retired — instant violation if recreated:**

```txt
lib/features/public-trust/
lib/features/legal-declarations/
components2/marketing/{declaration-shell,trust-control-surface,status-control-surface,...} for legal-docs
app/.../legal-declaration-page.shared.tsx
```

### Module root allowlist (`lib/features/<module>/`)

Allowed at module root ([`scripts/check-agent-contract.mjs`](../../scripts/check-agent-contract.mjs)):

```txt
actions/ · data/ · components/ · schemas/ · index.ts · server.ts · client.ts · types.ts · constants.ts · README.md · *.contract.ts
```

**`_SEAL.md` is forbidden at `lib/features/*` root.** Human + agent stop signs for Layer 2 live in:

- Route-group `app/.../_SEAL.md` (Layer 1, may document all layers)
- `components2/<name>/_SEAL.md` (Layer 3)
- `.cursor/rules/<name>-directory.mdc`

---

## Enforcement

| Layer | Mechanism |
| --- | --- |
| **ADR** | This document — canonical “why” for PRIORITY #2 |
| **AGENTS.md** | PRIORITY #2 block (IDE warning) + quickstart row |
| **Cursor rule** | `.cursor/rules/legal-docs-directory.mdc` (glob: legal-docs paths) |
| **Route seal** | `app/(main)/[locale]/legal-docs/_SEAL.md` |
| **CI / tests** | `tests/unit/legal-docs-surface-contract.test.ts` |
| **Agent contract** | `check-agent-contract.mjs` — module root entries; `legal-docs-directory.mdc` in REQUIRED_FILES |

---

## Consequences

**Positive:** One grep path per product; IDE sessions stop forked module names; agent-contract catches `_SEAL.md` drift at feature roots.

**Negative:** Agents must read surface rules before editing — non-negotiable overhead that prevents expensive human cleanup.

**When adding a new sealed surface:** ADR or amend this ADR · AGENTS quickstart row · `*-directory.mdc` · contract test · route `_SEAL.md` — same PR.

---

## References

- [AGENTS.md PRIORITY #2](../../AGENTS.md#priority-2--ide-anti-drift-three-layer-surfaces)
- [.cursor/rules/legal-docs-directory.mdc](../../.cursor/rules/legal-docs-directory.mdc)
- [.cursor/rules/no-dead-code-no-aliases.mdc](../../.cursor/rules/no-dead-code-no-aliases.mdc)
- [ADR-0032 — Drizzle PRIORITY #1](./0032-drizzle-migration-agent-ownership.md) (precedence: PRIORITY #1 migrations still win when schema is touched)
