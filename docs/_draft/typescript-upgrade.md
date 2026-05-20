# TypeScript performance and gate upgrade — Afenda

**Status:** Phase 0 shipped · Phases 1–5 planned  
**Canonical decision:** [ADR-0042](../decisions/0042-typescript-gate-performance.md)  
**Gate ladder:** [ADR-0033](../decisions/0033-verify-gate-ladder-naming.md)

---

## Problem

Three different “type” systems run in parallel, but L0 treated them as one:

| Layer | Role | Path-scoped? |
| --- | --- | --- |
| IDE (TS Server) | Feedback while editing | Per file |
| `pnpm lint:path` | ESLint + Afenda rules | Yes |
| `pnpm typecheck` | Whole-program `tsc --noEmit` | **No** |

`pnpm gate -- <paths>` used to always run full `typecheck` after ESLint. That made agents expect ~15–45s L0 when cold runs are often **many minutes** (`pretypecheck` typegen + monolithic graph, 8GB heap).

---

## Phase 0 — Shipped

### Commands

```bash
# After editing (default L0 — ESLint only)
pnpm gate -- lib/features/hrm/

# Explicit full app graph (before push)
pnpm gate:typecheck
# or
pnpm gate -- lib/features/hrm/ --typecheck

# Lint-only alias
pnpm gate:lint -- lib/features/hrm/

# Bare gate = typecheck only (unchanged)
pnpm gate

# Profiling
pnpm typecheck:profile
pnpm typecheck:diagnostics
```

### Already in repo (keep)

| Mechanism | Location |
| --- | --- |
| Split graphs | `typecheck`, `typecheck:test`, `typecheck:scripts` |
| Fast typegen | `scripts/next-typegen-fast.mjs` (`AFENDA_SKIP_WORKFLOW_PLUGIN`) |
| Incremental | `tsBuildInfoFile`, `assumeChangesOnlyAffectDirectDependencies` |
| Ambient types | `types: ["node"]` in `tsconfig.json` |
| Client/server barrels | ADR-0030 |

### Implementation files

- `scripts/gate-args.shared.mjs` — parse `--typecheck`, plan commands
- `scripts/gate.mjs` — lint-only default when paths passed
- `scripts/typecheck-profile.mjs` — typegen vs `tsc` timing
- `tests/unit/gate-args.shared.test.ts`

---

## Phase 1 — Project references (planned)

**Goal:** `tsc -b` rebuilds only affected slices.

```txt
tsconfig.base.json
tsconfig.lib.foundation.json   # auth, db, erp, i18n, portal
tsconfig.features.hrm.json     # pilot slice
tsconfig.components2.json
tsconfig.app.json            # app + .next/types
tsconfig.json                # solution: files: [], references: [...]
```

**Rules:** `composite: true`, emit declarations to `.artifacts/types/<slice>/`, keep `#features/*` imports.

**Caveats:** [TS#40431](https://github.com/microsoft/TypeScript/issues/40431) — use `tsc -b`, not `tsc -p` alone on referenced projects; export type changes invalidate downstream ([#47793](https://github.com/microsoft/TypeScript/issues/47793)).

---

## Phase 2 — Gate ↔ slice mapping (planned)

| Command | Behavior |
| --- | --- |
| `pnpm gate -- lib/features/hrm/` | `lint:path` + `tsc -b` HRM slice (+ app if routes touched) |
| `pnpm gate:typecheck` | Full solution `tsc -b` |

---

## Phase 3 — Typed ESLint (planned)

- `pnpm lint:typed` with `parserOptions.projectService: true`
- L2 / `gate:push` only — not L0 ([typescript-eslint project service](https://typescript-eslint.io/blog/project-service))
- Watch perf: [typescript-eslint#9571](https://github.com/typescript-eslint/typescript-eslint/issues/9571)

---

## Phase 4 — `tsgo` CI pilot (planned)

- Package: `@typescript/native-preview` / [typescript-go](https://github.com/microsoft/typescript-go)
- CI: run parallel to `tsc`; fail on `tsc` until parity proven
- Realistic expectation: often **25–40%** faster, not 10× ([#1507](https://github.com/microsoft/typescript-go/issues/1507))

---

## Phase 5 — Turborepo packages (defer)

Only if `tsc -b` solution time stays &gt;2–3 min warm after slice migration.

---

## Decision matrix

| Approach | Verdict |
| --- | --- |
| Path-scoped `tsc` on one `tsconfig.json` | Reject |
| `gate -- paths` = lint only; typecheck explicit | **Adopt (Phase 0)** |
| Project references + `tsc -b` | Adopt (Phase 1–2) |
| `projectService` on every L0 lint | Reject |
| `lint:typed` at L2 | Adopt (Phase 3) |
| `tsgo` dual-run in CI | Pilot (Phase 4) |
| `isolatedDeclarations` | Defer |

---

## Hygiene (ongoing)

1. Barrel diet on `index.ts` server graphs.
2. Profile hot spots: `lib/db/schema.ts`, heavy generics — `pnpm typecheck:diagnostics`, optional `--generateTrace`.
3. Do not run two full `typecheck` concurrently (`.tsbuildinfo` write contention).
4. Invalidate Turbo typecheck cache when `pnpm-lock.yaml` changes.

---

## References

- [TypeScript Performance wiki](https://github.com/microsoft/TypeScript/wiki/Performance)
- [Project references handbook](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [TS#25600](https://github.com/microsoft/TypeScript/issues/25600) — project references discussion
