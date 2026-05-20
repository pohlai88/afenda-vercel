# ADR-0042 — TypeScript gate honesty and performance ladder

| Field | Value |
| ----- | ----- |
| **Status** | Accepted (Phase 0 implemented) |
| **Date** | 2026-05-20 |
| **Supersedes** | Misleading L0 cost for `pnpm gate -- <paths>` in ADR-0033 narrative only |
| **Implements in code** | [`scripts/gate.mjs`](../../scripts/gate.mjs), [`scripts/gate-args.shared.mjs`](../../scripts/gate-args.shared.mjs), [`scripts/typecheck-profile.mjs`](../../scripts/typecheck-profile.mjs), [`package.json`](../../package.json) (`gate:lint`, `gate:typecheck`, `typecheck:diagnostics`, `typecheck:profile`) |
| **Related** | [ADR-0033](./0033-verify-gate-ladder-naming.md) · [ADR-0007](./0007-turborepo-single-package-verify-cache.md) · [`docs/_draft/typescript-upgrade.md`](../_draft/typescript-upgrade.md) |

---

## Context

Afenda uses a **single-package** TypeScript app graph (`tsconfig.json` + split test/scripts configs). `pnpm typecheck` runs `next typegen` then `tsc --noEmit` over the **entire** app program (8GB heap). Warm incremental runs can be tens of seconds; **cold runs are often many minutes** — not the “~15–45s” implied when agents pass paths to `pnpm gate`.

**TypeScript cannot path-scope `tsc`** on one monolithic `tsconfig`: ESLint paths narrow; the checker must see the full output graph ([TS modules theory](https://www.typescriptlang.org/docs/handbook/modules/theory.html)).

Prior behavior ran **full typecheck on every** `pnpm gate -- <paths>`, causing agent lock contention and false expectations.

---

## Decision

### Phase 0 (implemented)

| Command | Behavior |
| --- | --- |
| `pnpm gate` | App `typecheck` only (unchanged) |
| `pnpm gate -- <paths>` | **`lint:path` only** — no implicit `typecheck` |
| `pnpm gate -- <paths> --typecheck` | `lint:path` + `typecheck` |
| `pnpm gate:lint -- <paths>` | `lint:path` only (explicit alias) |
| `pnpm gate:typecheck` | App `typecheck` only |
| `pnpm typecheck:diagnostics` | `tsc --noEmit --extendedDiagnostics` |
| `pnpm typecheck:profile` | Split timing: `next-typegen-fast` vs `tsc` |

**Agent close condition (concurrent):**

```txt
After feature edit:  pnpm gate -- <touched-paths>
Before push:         pnpm gate:typecheck  (or pnpm gate:push)
```

**IDE** remains the primary per-file type feedback channel during editing.

### Later phases (documented, not implemented here)

| Phase | Scope |
| --- | --- |
| **1** | Solution `tsconfig` + composite project references + `tsc -b` slices |
| **2** | `gate` maps path prefixes → slice `tsc -b` |
| **3** | `pnpm lint:typed` with `parserOptions.projectService` at L2 only |
| **4** | `tsgo` CI pilot parallel to `tsc` |
| **5** | Turborepo packages only if slices plateau |

**Rejected for now:** path-scoped `tsc` on monolithic config; `projectService` on every L0 lint; `isolatedDeclarations` (no emit pipeline).

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
