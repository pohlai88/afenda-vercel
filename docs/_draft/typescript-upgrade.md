# TypeScript performance and gate upgrade — Afenda

**Status:** Phases 0–7 shipped · `tsgo` CI pilot non-blocking until exit parity on `main`  
**Canonical decision:** [ADR-0042](../decisions/0042-typescript-gate-performance.md)  
**Operator guide:** [`docs/testing/typescript-compile-efficiency.md`](../testing/typescript-compile-efficiency.md)  
**Gate ladder:** [ADR-0033](../decisions/0033-verify-gate-ladder-naming.md)

---

## Problem

Three different “type” systems run in parallel, but L0 used to treat them as one:

| Layer | Role | Path-scoped? |
| --- | --- | --- |
| IDE (TS Server) | Feedback while editing | Per file |
| `pnpm lint:path` | ESLint + Afenda rules | Yes |
| `pnpm typecheck` | Whole-program `tsc -b` | **Slices** (Phases 1–2, 6–7) |

| Command | What runs |
| --- | --- |
| `pnpm gate -- <paths>` | ESLint only (L0 default) |
| `pnpm gate -- <paths> --typecheck` | ESLint + slice-aware `tsc` |
| `pnpm gate:typecheck` | Full app solution (`tsc -b tsconfig.build.json`) |

---

## Agent quick reference

```bash
# After edits (concurrent agents — default)
pnpm gate -- <touched-paths>

# After edits when you changed types in touched trees
pnpm gate -- <touched-paths> --typecheck

# Before push
pnpm gate:typecheck          # or pnpm gate:push

# Evidence / promotion
pnpm typecheck:profile
pnpm typecheck:compare       # tsc vs tsgo exit parity
```

**Do not** pass `.md` or `.json` config paths to `pnpm gate` — ESLint has no config for them and fails with “file ignored” warnings.

---

## Phase 0 — Gate honesty (shipped)

`pnpm gate -- <paths>` no longer runs implicit full `typecheck`. That removed agent lock contention and false “~15–45s” expectations on cold graphs.

---

## Phase 1 — Project references (shipped)

### `tsc` solution

```txt
tsconfig.base.json
.config/tsconfig.lib-db.json       # composite: lib/db
.config/tsconfig.lib-i18n.json   # composite: lib/i18n/**/*.shared.ts
tsconfig.json                    # platform; references lib-db + lib-i18n
tsconfig.build.json              # solution root (files: [])
```

```bash
pnpm typecheck                 # typecheck-build.mjs → tsc -b tsconfig.build.json
pnpm typecheck:lib-db          # leaf: lib/db only
pnpm typecheck:platform        # platform (references composites)
```

**Rule:** Full builds use **one** `tsc -b tsconfig.build.json` — not separate `-b` on each leaf in sequence (TypeScript project-references handbook).

`typecheck-build.mjs` **dedupes** build project paths when a slice plan would list the same config twice.

### `tsgo` solution (Phase 4 mirror)

```txt
tsconfig.base.tsgo.json              # no baseUrl (tsgo requirement)
.config/tsconfig.tsgo.lib-db.json
.config/tsconfig.tsgo.lib-i18n.json
tsconfig.tsgo.json
tsconfig.tsgo.build.json
```

---

## Phase 2 — Gate ↔ slice mapping (shipped)

| Touched paths | `gate -- … --typecheck` runs |
| --- | --- |
| `lib/db/**` only | `tsc -b .config/tsconfig.lib-db.json` |
| `lib/i18n/**/*.shared.ts` only | `tsc -b .config/tsconfig.lib-i18n.json` |
| `lib/i18n/**/*.server.ts` (or `lib/i18n/` tree) | `tsc -b tsconfig.json` (platform) |
| `tests/**` only | `tsc --noEmit -p .config/tsconfig.test.json` |
| `scripts/**` only | `tsc --noEmit -p .config/tsconfig.scripts.json` |
| Other app paths | `tsc -b tsconfig.json` (platform) |
| Mixed buckets (e.g. db + features, i18n shared + app) | `tsc -b tsconfig.build.json` (solution) |
| `tests/**` + `scripts/**` | both `noEmit` graphs (sequential) |

Dry-run: `pnpm gate:dry-run -- <paths> --typecheck`

---

## Phase 3 — Typed ESLint (shipped, L2 only)

```bash
pnpm lint:typed -- lib/features/hrm/
```

Uses `projectService` — **not** part of L0 `gate -- <paths>`.

---

## Phase 4 — `tsgo` CI pilot (shipped)

**Package:** `@typescript/native-preview` (`pnpm exec tsgo`). Listed in knip `ignoreDependencies` (invoked via `pnpm exec`, not a static import).

```bash
pnpm typecheck:tsgo                              # advisory (exit 0 on tsgo-only failures)
AFENDA_TSGO_ENFORCE=1 pnpm typecheck:tsgo        # blocking when promoting
```

**CI:** `pnpm typecheck:tsgo` with `continue-on-error: true` after `verify:no-test`. **`tsc` remains merge authority.**

**Report:** `.artifacts/tsgo-pilot-report.txt`

---

## Phase 5 — Turborepo typecheck graph (shipped)

Single-package repo — Turbo orchestrates parallel graphs, not a pnpm workspace split:

```txt
typecheck:lib-db  →  typecheck:platform
                 ↘  typecheck:test
                 ↘  typecheck:scripts
```

```bash
pnpm typecheck:turbo
```

**Local agents:** prefer `pnpm typecheck` (no Turbo startup tax on every task).

---

## Phase 6 — Tests/scripts slices + parity (shipped)

```bash
pnpm typecheck:compare
AFENDA_TSGO_ENFORCE=1 pnpm typecheck:compare
```

Writes `.artifacts/typecheck-parity-report.txt` — promote `tsgo` to blocking only when **`exitParity=match`** on `main` with `AFENDA_TSGO_ENFORCE=1`.

---

## Phase 7 — `lib/i18n` acyclic composite (shipped)

### Problem

`lib/i18n` imported `#features/hrm` and `#features/orbit` for forward-path segment allowlists. That blocked a `lib/i18n` composite slice and kept platform builds pulling feature graphs through sanitization helpers.

### Fix (layering)

| Change | Purpose |
| --- | --- |
| `lib/i18n/org-apps-route-segments.shared.ts` | SSOT for HRM + Orbit URL segments used in `sanitizePathAfterOrgSlug` |
| `lib/features/hrm/hrm-apps-path.shared.ts` | Re-exports segments from `#lib/i18n/...` (registry tests unchanged) |
| `lib/features/orbit/planner-orbit-path.shared.ts` | Re-exports orbit segment set from lib SSOT |
| `lib/i18n/org-apps-redirect.server.ts` | `organizationAppsPath(slug, "home")` via `#lib/org-apps-module-paths` — not `#features/nexus` |

**Enforced by:** `tests/unit/lib-i18n-boundary.test.ts` (no `from "#features/…"` in `lib/i18n/`).

### Composite configs

| Config | Include |
| --- | --- |
| `.config/tsconfig.lib-i18n.json` | `lib/i18n/**/*.shared.ts` |
| `.config/tsconfig.tsgo.lib-i18n.json` | same (tsgo parity) |

Platform `tsconfig.json` / `tsconfig.tsgo.json` **reference** both `lib-db` and `lib-i18n` and **exclude** `lib/i18n/**/*.shared.ts` from `include` (no double compile).

---

## Import-boundary cleanup (shipped with Phase 7 PR)

Repeated **agent-contract** failures (same class of error) were fixed in the same release:

| Area | Fix |
| --- | --- |
| 27× `app/.../hrm/*/page.tsx` | `HrmShellAccessDenied*` from `#features/hrm` barrel, not deep `components/hrm-shell-access-denied.server` |
| `org-notifications` | `constants.shared.ts` → allowed `constants.ts`; push schemas on `#features/org-notifications` barrel |
| `components2/demo/*` | `#features/demo` instead of deep `schemas/*.shared` |
| Knip | `public/sw-org-notifications.js`, `@typescript/native-preview` in ignore lists |

---

## Decision matrix

| Approach | Verdict |
| --- | --- |
| `gate -- paths` = lint only | **Adopt** |
| Solution `tsc -b` via `tsconfig.build.json` | **Adopt** |
| Gate path → slice `tsc` | **Adopt** |
| `lint:typed` at L2 | **Adopt** |
| `tsgo` dual-run in CI (non-blocking) | **Adopt** |
| Turbo parallel typecheck graphs | **Adopt** |
| Gate slices for `tests/` + `scripts/` | **Adopt** |
| `typecheck:compare` | **Adopt** |
| `lib/i18n` acyclic SSOT + `lib-i18n` composite | **Adopt** |
| `lib/auth` composite slice | **Defer** |
| `tsgo` blocks merge | **Defer** until parity on `main` |
| pnpm workspace package split | **Defer** |
| `isolatedDeclarations` | **Defer** |

---

## File inventory

| Path | Role |
| --- | --- |
| `tsconfig.build.json` / `tsconfig.tsgo.build.json` | Solution roots |
| `.config/tsconfig.lib-db.json` / `tsgo.lib-db.json` | `lib/db` composite |
| `.config/tsconfig.lib-i18n.json` / `tsgo.lib-i18n.json` | `lib/i18n` shared composite |
| `lib/i18n/org-apps-route-segments.shared.ts` | Route segment SSOT |
| `scripts/typecheck-build.mjs` | `tsc -b` + deduped project list |
| `scripts/typecheck-compare.mjs` | tsc vs tsgo parity |
| `scripts/lib/gate-typecheck-slices.shared.mjs` | Gate slice mapping |
| `tests/unit/lib-i18n-boundary.test.ts` | No `#features` in `lib/i18n` |
| `tests/unit/gate-typecheck-slices.shared.test.ts` | Slice resolution tests |
| `.config/knip.json` | SW + tsgo package ignores |

---

## Hygiene

1. Do not run two full `pnpm typecheck` concurrently (`.tsbuildinfo` races).
2. Do not commit `.source/**` (Fumadocs generated).
3. Invalidate Turbo cache when `tsconfig*.json` or lockfile changes.
4. Pass only `.ts`/`.tsx`/`.mjs` paths to `pnpm gate` unless you intend ESLint on those extensions.

---

## References

- [TypeScript native previews](https://devblogs.microsoft.com/typescript/announcing-typescript-native-previews/)
- [Project references handbook](https://www.typescriptlang.org/docs/handbook/project-references.html)
