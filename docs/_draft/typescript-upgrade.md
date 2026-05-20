# TypeScript performance and gate upgrade — Afenda

**Status:** Phases 0–5 shipped · `tsgo` CI pilot is non-blocking until parity  
**Canonical decision:** [ADR-0042](../decisions/0042-typescript-gate-performance.md)  
**Gate ladder:** [ADR-0033](../decisions/0033-verify-gate-ladder-naming.md)

---

## Problem

Three different “type” systems run in parallel, but L0 treated them as one:

| Layer | Role | Path-scoped? |
| --- | --- | --- |
| IDE (TS Server) | Feedback while editing | Per file |
| `pnpm lint:path` | ESLint + Afenda rules | Yes |
| `pnpm typecheck` | Whole-program `tsc -b` | **Slices** (Phase 1–2) |

`pnpm gate -- <paths>` runs ESLint only by default. Full app graph: `pnpm gate:typecheck` or `pnpm gate -- <paths> --typecheck` (slice-aware).

---

## Phase 0 — Shipped

```bash
pnpm gate -- lib/features/hrm/              # ESLint only (L0)
pnpm gate:typecheck                         # full tsc -b before push
pnpm gate -- lib/features/hrm/ --typecheck  # ESLint + platform slice
pnpm typecheck:profile
```

---

## Phase 1 — Project references (shipped)

```txt
tsconfig.base.json
.config/tsconfig.lib-db.json    # composite lib/db
tsconfig.json                   # platform; references lib-db
tsconfig.build.json             # solution root (tsc)
```

```bash
pnpm typecheck              # typecheck-build.mjs → tsc -b tsconfig.build.json
pnpm typecheck:lib-db       # leaf slice only
pnpm typecheck:platform     # platform graph (references lib-db)
```

Full builds use **`tsconfig.build.json`** as the solution root (`files: []` + `references` only) — not two separate `-b` invocations on leaf configs.

---

## Phase 2 — Gate ↔ slice mapping (shipped)

| Touched paths | `gate -- … --typecheck` |
| --- | --- |
| `lib/db/**` only | `tsc -b .config/tsconfig.lib-db.json` |
| Other paths | `tsc -b tsconfig.json` (platform) |
| Mixed | `tsc -b tsconfig.build.json` (solution root) |

---

## Phase 3 — Typed ESLint (shipped, L2)

```bash
pnpm lint:typed -- lib/features/hrm/
```

Not part of L0 `gate -- <paths>`.

---

## Phase 4 — `tsgo` CI pilot (shipped)

**Package:** `@typescript/native-preview` (`pnpm exec tsgo`).

**Parallel configs (no `baseUrl` — tsgo requirement):**

```txt
tsconfig.base.tsgo.json
.config/tsconfig.tsgo.lib-db.json
tsconfig.tsgo.json
tsconfig.tsgo.build.json
```

```bash
pnpm typecheck:tsgo                              # advisory (exit 0 on tsgo errors)
AFENDA_TSGO_ENFORCE=1 pnpm typecheck:tsgo        # blocking when ready
```

**CI:** `.github/workflows/ci.yml` runs `pnpm typecheck:tsgo` with `continue-on-error: true` after `verify:no-test`. **`tsc` remains the merge authority.**

**Report:** `.artifacts/tsgo-pilot-report.txt` (timing + stderr on failure).

**Expectation:** Often **25–40%** faster than `tsc` on warm runs — not 10×. Compare with `pnpm typecheck:profile`.

---

## Phase 5 — Turborepo typecheck graph (shipped)

Single-package repo — **not** a pnpm workspace split. Turbo orchestrates parallel graphs:

```txt
typecheck:lib-db  →  typecheck:platform
                 ↘  typecheck:test
                 ↘  typecheck:scripts   (parallel after lib-db)
```

```bash
pnpm typecheck:turbo    # CI-style parallel graphs
pnpm verify:no-test     # uses typecheck:lib-db + platform + test + scripts
```

**Local agents** keep `pnpm typecheck` (direct `typecheck-build.mjs`, no Turbo startup tax).

---

## Decision matrix

| Approach | Verdict |
| --- | --- |
| `gate -- paths` = lint only | **Adopt** |
| Project references + `tsc -b` | **Adopt** |
| Gate path → slice `tsc -b` | **Adopt** |
| `lint:typed` at L2 | **Adopt** |
| `tsgo` dual-run in CI (non-blocking) | **Adopt (Phase 4)** |
| Turbo parallel typecheck graphs | **Adopt (Phase 5)** |
| `tsgo` blocks merge | Defer until `AFENDA_TSGO_ENFORCE=1` + parity review |
| pnpm workspace package split | Defer (out of scope for single-package repo) |

---

## File inventory

| Path | Role |
| --- | --- |
| `tsconfig.base.json` / `tsconfig.build.json` | `tsc` solution |
| `tsconfig.base.tsgo.json` / `tsconfig.tsgo.build.json` | `tsgo` solution (no `baseUrl`) |
| `scripts/typecheck-build.mjs` | `tsc -b` orchestration |
| `scripts/typecheck-tsgo-pilot.mjs` | `tsgo` CI pilot |
| `scripts/lib/gate-typecheck-slices.shared.mjs` | Gate slice mapping |
| `turbo.json` | `typecheck:lib-db`, `typecheck:platform`, test/scripts deps |
| `docs/testing/typescript-compile-efficiency.md` | Operator guide |

---

## Hygiene

1. Do not run two full `pnpm typecheck` concurrently (`.tsbuildinfo` contention).
2. Invalidate Turbo cache when `tsconfig*.json` or `pnpm-lock.yaml` changes.
3. Promote `tsgo` to blocking only after report parity with `tsc` on `main`.

---

## References

- [TypeScript native previews](https://devblogs.microsoft.com/typescript/announcing-typescript-native-previews/)
- [Project references handbook](https://www.typescriptlang.org/docs/handbook/project-references.html)
