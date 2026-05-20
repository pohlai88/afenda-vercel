# TypeScript performance and gate upgrade — Afenda

**Status:** Phases 0–3 shipped (lib/db slice + gate mapping + typed ESLint) · Phases 4–5 planned  
**Canonical decision:** [ADR-0042](../decisions/0042-typescript-gate-performance.md)  
**Gate ladder:** [ADR-0033](../decisions/0033-verify-gate-ladder-naming.md)

---

## Problem

Three different “type” systems run in parallel, but L0 treated them as one:

| Layer | Role | Path-scoped? |
| --- | --- | --- |
| IDE (TS Server) | Feedback while editing | Per file |
| `pnpm lint:path` | ESLint + Afenda rules | Yes |
| `pnpm typecheck` | Whole-program `tsc -b` | **Slices only** (Phase 1–2) |

`pnpm gate -- <paths>` runs ESLint only by default. Full app graph: `pnpm gate:typecheck` or `pnpm gate -- <paths> --typecheck` (slice-aware).

---

## Phase 0 — Shipped

### Commands

```bash
# After editing (default L0 — ESLint only)
pnpm gate -- lib/features/hrm/

# Full app graph (before push)
pnpm gate:typecheck

# Lint + slice typecheck (HRM → platform only; skips lib/db when unchanged)
pnpm gate -- lib/features/hrm/ --typecheck

# Lint-only alias
pnpm gate:lint -- lib/features/hrm/

# Bare gate = full solution typecheck
pnpm gate

# Profiling
pnpm typecheck:profile
pnpm typecheck:diagnostics
```

### Already in repo (keep)

| Mechanism | Location |
| --- | --- |
| Split graphs | `typecheck`, `typecheck:test`, `typecheck:scripts` |
| Fast typegen | `scripts/next-typegen-fast.mjs` |
| Incremental | `tsBuildInfoFile`, `assumeChangesOnlyAffectDirectDependencies` |
| Ambient types | `types: ["node"]` in `tsconfig.base.json` |
| Client/server barrels | ADR-0030 |

### Implementation files

- `scripts/gate-args.shared.mjs` — parse `--typecheck`, plan commands
- `scripts/gate.mjs` — lint-only default; slice `typecheck-build` when `--typecheck`
- `scripts/typecheck-profile.mjs` — typegen vs `tsc -b` timing
- `tests/unit/gate-args.shared.test.ts`

---

## Phase 1 — Project references (shipped, pilot slice)

**Goal:** `tsc -b` rebuilds only affected composite projects.

```txt
tsconfig.base.json              # shared compilerOptions + paths
.config/tsconfig.lib-db.json    # composite: lib/db only (acyclic)
tsconfig.json                   # platform graph; references lib-db; excludes lib/db from include
tsconfig.build.json             # solution: files: [], references: [lib-db, platform]
```

**Emit:** declaration output → `.artifacts/types/lib-db/` (gitignored via `.artifacts/`).

**Why only `lib/db` today:** `lib/auth` → `lib/i18n` → `#features/*` and `lib/erp` → `#lib/auth` prevent a larger foundation slice without refactors. Further slices (HRM-only) need graph surgery or accept “platform” as the main incremental unit.

**Commands:**

```bash
pnpm typecheck              # tsc -b lib-db + platform (via scripts/typecheck-build.mjs)
pnpm typecheck:lib-db       # schema slice only
pnpm typecheck:platform     # typegen + platform graph
```

**Caveats:** [TS#40431](https://github.com/microsoft/TypeScript/issues/40431) — use `tsc -b`, not `tsc -p` on referenced projects; export type changes invalidate downstream ([#47793](https://github.com/microsoft/TypeScript/issues/47793)).

---

## Phase 2 — Gate ↔ slice mapping (shipped)

| Touched paths | `gate -- … --typecheck` runs |
| --- | --- |
| `lib/db/**` only | `tsc -b .config/tsconfig.lib-db.json` |
| Anything else (e.g. `lib/features/hrm/`) | `tsc -b tsconfig.json` (platform; skips lib/db if up to date) |
| Mixed db + feature paths | Full solution (both slices) |
| `pnpm gate:typecheck` | Full solution via `pnpm typecheck` |

**Implementation:** `scripts/lib/gate-typecheck-slices.shared.mjs` · `scripts/typecheck-build.mjs`

---

## Phase 3 — Typed ESLint (shipped, L2)

```bash
pnpm lint:typed
pnpm lint:typed -- lib/features/hrm/
```

- Config: `.config/eslint.typed.config.mjs` (`parserOptions.projectService: true`)
- **Not** part of L0 `lint:path` / `pnpm gate -- <paths>`
- Use before push / in `gate:push` when type-aware ESLint rules are needed
- Watch perf: [typescript-eslint#9571](https://github.com/typescript-eslint/typescript-eslint/issues/9571)

---

## Phase 4 — `tsgo` CI pilot (planned)

- Package: `@typescript/native-preview` / [typescript-go](https://github.com/microsoft/typescript-go)
- CI: run parallel to `tsc`; fail on `tsc` until parity proven
- Realistic expectation: often **25–40%** faster, not 10× ([#1507](https://github.com/microsoft/typescript-go/issues/1507))

---

## Phase 5 — Turborepo packages (defer)

Only if `tsc -b` solution time stays &gt;2–3 min warm after more slices.

---

## Decision matrix

| Approach | Verdict |
| --- | --- |
| Path-scoped `tsc` on one `tsconfig.json` | Reject |
| `gate -- paths` = lint only; typecheck explicit | **Adopt (Phase 0)** |
| Project references + `tsc -b` | **Adopt (Phase 1 — lib/db pilot)** |
| Gate path → slice `tsc -b` | **Adopt (Phase 2)** |
| `projectService` on every L0 lint | Reject |
| `lint:typed` at L2 | **Adopt (Phase 3)** |
| `tsgo` dual-run in CI | Pilot (Phase 4) |
| `isolatedDeclarations` | Defer |

---

## Hygiene (ongoing)

1. Barrel diet on `index.ts` server graphs.
2. Profile hot spots: `lib/db/schema.ts`, heavy generics — `pnpm typecheck:diagnostics`, optional `--generateTrace`.
3. Do not run two full `typecheck` concurrently (`.tsbuildinfo` write contention).
4. Invalidate Turbo typecheck cache when `pnpm-lock.yaml` or `tsconfig*.json` changes.

---

## File inventory (Phases 0–3)

| Path | Role |
| --- | --- |
| `tsconfig.base.json` | Shared compiler options |
| `tsconfig.json` | Platform graph (Next.js + Workflow plugins) |
| `tsconfig.build.json` | Solution references |
| `.config/tsconfig.lib-db.json` | Composite `lib/db` slice |
| `scripts/typecheck-build.mjs` | `typegen` + `tsc -b` orchestration |
| `scripts/lib/gate-typecheck-slices.shared.mjs` | Path → slice mapping |
| `scripts/gate-args.shared.mjs` | Gate CLI parsing |
| `scripts/gate.mjs` | L0 runner |
| `scripts/lint-typed.mjs` | L2 typed ESLint entry |
| `.config/eslint.typed.config.mjs` | `projectService` overlay |
| `tests/unit/gate-args.shared.test.ts` | Gate plan tests |
| `tests/unit/gate-typecheck-slices.shared.test.ts` | Slice resolver tests |
| `docs/testing/typescript-compile-efficiency.md` | Operator guide |

## References

- [TypeScript Performance wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
- [Project references handbook](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TS#25600](https://github.com/microsoft/TypeScript/issues/25600) — project references discussion
