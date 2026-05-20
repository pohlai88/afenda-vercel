# ADR-0042 — TypeScript gate honesty and performance ladder

| Field | Value |
| ----- | ----- |
| **Status** | Accepted (Phases 0–6 implemented; tsgo pilot non-blocking) |
| **Date** | 2026-05-20 |
| **Supersedes** | Misleading L0 cost for `pnpm gate -- <paths>` in ADR-0033 narrative only |
| **Implements in code** | [`scripts/gate.mjs`](../../scripts/gate.mjs), [`scripts/gate-args.shared.mjs`](../../scripts/gate-args.shared.mjs), [`scripts/typecheck-build.mjs`](../../scripts/typecheck-build.mjs), [`scripts/lib/gate-typecheck-slices.shared.mjs`](../../scripts/lib/gate-typecheck-slices.shared.mjs), [`scripts/lint-typed.mjs`](../../scripts/lint-typed.mjs), [`tsconfig.base.json`](../../tsconfig.base.json), [`.config/tsconfig.lib-db.json`](../../.config/tsconfig.lib-db.json), [`package.json`](../../package.json) |
| **Related** | [ADR-0033](./0033-verify-gate-ladder-naming.md) · [ADR-0007](./0007-turborepo-single-package-verify-cache.md) · [`docs/_draft/typescript-upgrade.md`](../_draft/typescript-upgrade.md) |

---

## Context

Afenda uses a **solution-style** app graph: composite `lib/db` + platform `tsconfig.json` (split test/scripts configs). `pnpm typecheck` runs `next typegen` then `tsc -b` (8GB heap). Warm incremental runs can be tens of seconds; **cold runs are often many minutes** — not the “~15–45s” implied when agents pass paths to `pnpm gate`.

**ESLint paths narrow; `tsc` slices only.** The first composite slice is `lib/db` only (acyclic). Feature work uses the platform graph, which skips rebuilding `lib/db` when its `.tsbuildinfo` is fresh.

Prior behavior ran **full typecheck on every** `pnpm gate -- <paths>`, causing agent lock contention and false expectations.

---

## Decision

### Phase 0 (implemented)

| Command | Behavior |
| --- | --- |
| `pnpm gate` | App `typecheck` only (unchanged) |
| `pnpm gate -- <paths>` | **`lint:path` only** — no implicit `typecheck` |
| `pnpm gate -- <paths> --typecheck` | `lint:path` + slice `tsc -b` (see Phase 2) |
| `pnpm gate:lint -- <paths>` | `lint:path` only (explicit alias) |
| `pnpm gate:typecheck` | App `typecheck` only |
| `pnpm typecheck` | `typecheck-build.mjs` → `tsc -b tsconfig.build.json` (solution root) |
| `pnpm typecheck:diagnostics` | `tsc -b` solution + `--extendedDiagnostics` |
| `pnpm typecheck:profile` | Split timing: `next-typegen-fast` vs `tsc -b` |
| `pnpm lint:typed` | ESLint + `projectService` (L2; not L0) |

**Agent close condition (concurrent):**

```txt
After feature edit:  pnpm gate -- <touched-paths>
Before push:         pnpm gate:typecheck  (or pnpm gate:push)
```

**IDE** remains the primary per-file type feedback channel during editing.

### Phases 1–3 (implemented)

| Phase | Scope |
| --- | --- |
| **1** | `tsconfig.build.json` solution (`files: []` + references); full check via one `tsc -b`; leaf configs for Turbo/gate slices |
| **2** | `gate -- <paths> --typecheck` → `gate-typecheck-slices` (db-only vs platform vs full) |
| **3** | `pnpm lint:typed` + `.config/eslint.typed.config.mjs` (`projectService` at L2) |

### Phases 4–5 (implemented)

| Phase | Scope |
| --- | --- |
| **4** | `@typescript/native-preview` (`tsgo`), `tsconfig.*.tsgo.json`, `pnpm typecheck:tsgo`, CI step (non-blocking), `.artifacts/tsgo-pilot-report.txt` |
| **5** | Turbo tasks `typecheck:lib-db` → `typecheck:platform`; `typecheck:test` / `typecheck:scripts` parallel after lib-db; `verify*` uses slice tasks; `pnpm typecheck:turbo` |

### Phase 6 (implemented)

| Phase | Scope |
| --- | --- |
| **6** | Gate `--typecheck` maps `tests/**` and `scripts/**` to their isolated `tsc --noEmit -p` graphs; `pnpm typecheck:compare` records `tsc` vs `tsgo` exit parity (`.artifacts/typecheck-parity-report.txt`) |

**Deferred:** `lib/auth` / `lib/i18n` composite slices (import graph cycles via `#features`); `tsgo` as merge gate until `typecheck:compare` is green on `main`; pnpm workspace package split; `isolatedDeclarations`.

**Rejected:** path-scoped `tsc` on one non-composite config; `projectService` on every L0 lint.

---

## Consequences

### Positive

- L0 with paths matches real cost (ESLint-only, typically seconds).
- Agents stop assuming “gate paths” narrowed TypeScript.
- Profiling commands support evidence-based Phase 1 sizing.

### Negative

- Agents must remember `pnpm gate:typecheck` before push when they only ran `gate -- paths`.
- ADR-0033 table rows need mental update: “gate with paths” ≠ “gate + typecheck”.

---

## Compliance

- **AGENTS.md §2** and **`.cursor/rules/targeted-verification.mdc`** updated for Phase 0 commands.
- **ADR-0033** revision history references this ADR.

---

## Revision history

| Date | Change |
| ---- | ------ |
| 2026-05-20 | Phase 0: gate split, diagnostics/profile scripts, ADR acceptance |
| 2026-05-20 | Phases 1–3: `tsc -b` lib-db slice, gate slice mapping, `lint:typed` |
| 2026-05-20 | Phases 4–5: tsgo CI pilot (non-blocking), Turbo parallel typecheck graphs |
| 2026-05-20 | Phase 6: tests/scripts gate slices, `typecheck:compare` parity reporter |
