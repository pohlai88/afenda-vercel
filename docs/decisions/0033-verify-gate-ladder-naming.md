# ADR-0033 — Verify gate ladder and command naming (`gate` / `:full`)

| Field | Value |
| ----- | ----- |
| **Status** | Accepted |
| **Date** | 2026-05-19 |
| **Supersedes** | Informal “run everything” habit; ambiguous use of `pnpm lint` as an edit-loop command |
| **Does not supersede** | [ADR-0007](./0007-turborepo-single-package-verify-cache.md) (Turbo task cache), [ADR-0014](./0014-post-admin-enterprise-quality-gates.md) (phase gates), [ADR-0032](./0032-drizzle-migration-agent-ownership.md) (drizzle narrow gate) |
| **Implements in code** | [`package.json`](../../package.json) (`gate`, `gate:help`, `gate:dry-run`, `gate:push`, `gate:merge`, `lint:path`, `lint:full`, `typecheck:full`); [`scripts/gate.mjs`](../../scripts/gate.mjs), [`scripts/gate-help.mjs`](../../scripts/gate-help.mjs), [`scripts/gate-dry-run.mjs`](../../scripts/gate-dry-run.mjs), [`scripts/lint-path.mjs`](../../scripts/lint-path.mjs); [`.cursor/rules/targeted-verification.mdc`](../../.cursor/rules/targeted-verification.mdc); [AGENTS.md](../../AGENTS.md) §2 Gate ladder |
| **Related** | `.cursor/rules/post-task-residue.mdc` · `.cursor/rules/testing.mdc` |

---

## Context

Developers and IDE agents were running **`pnpm lint`**, **`pnpm verify*`**, **`pnpm typecheck*`**, **`pnpm build`**, and **`pnpm test:e2e`** in sequence after every edit. That replays the entire CI graph locally (often **8–15+ minutes** on Windows) even when only one module changed.

Problems:

| Problem | Effect |
| --- | --- |
| **`pnpm lint` sounds like ESLint** | It runs ~18 Turbo governance tasks + full-repo ESLint — not an edit-loop tool |
| **No `:full` suffix** | `typecheck` (app graph) vs all three TS graphs was undocumented in command names |
| **Tier confusion** | AGENTS.md listed tiers but command names did not encode frequency/cost |
| **Duplicate work** | `lint` + `verify:parallel` + separate `typecheck*` runs the same tasks twice |

At ~10% ERP completion, slowness is dominated by **which gates run**, not missing monorepo layout ([ADR-0007](./0007-turborepo-single-package-verify-cache.md)).

---

## Decision

Adopt a **Gate Ladder** with explicit **common** vs **`:full`** command names.

### Ladder (use the lowest sufficient tier)

| Tier | When | Command | Typical cost (warm, local) |
| --- | --- | --- | --- |
| **L0** | After every edit / agent task | `pnpm gate -- <touched-paths…>` | ESLint only (see [ADR-0042](./0042-typescript-gate-performance.md)) |
| **L0** | Before push (app types) | `pnpm gate:typecheck` | warm ~10–30s; cold often minutes |
| **L0** | Types only (no ESLint path handy) | `pnpm gate` or `pnpm typecheck` | app graph |
| **L1** | Git commit | lint-staged (automatic) | staged files only |
| **L2** | Before push / open PR | `pnpm gate:push` | ~2–5 min |
| **L3** | Pre-merge / route graph risk | `pnpm gate:merge` | ~5–10 min |
| **L4** | CI | GitHub Actions (sharded) | parallel jobs — do not replay locally unless debugging |

### Command vocabulary

#### Common (edit loop — run often)

| Command | Meaning |
| --- | --- |
| **`pnpm gate:help`** | Print full gate ladder |
| **`pnpm gate:dry-run -- <paths>`** | Print planned L0 commands without executing |
| **`pnpm gate -- <paths>`** | **Default L0:** targeted ESLint only ([ADR-0042](./0042-typescript-gate-performance.md)) |
| **`pnpm gate -- <paths> --typecheck`** | ESLint + app `typecheck` |
| **`pnpm gate:typecheck`** | App `typecheck` only |
| **`pnpm gate:lint -- <paths>`** | ESLint only |
| **`pnpm gate`** | App `typecheck` only; prints tip to pass paths |
| **`pnpm typecheck`** | App TypeScript graph (`tsc --noEmit` after `next typegen`) |
| **`pnpm lint:path -- <paths>`** | Targeted ESLint only — never `eslint .` |

Add **`pnpm typecheck:test`** or **`pnpm typecheck:scripts`** when those trees change (same tier as L0).

#### Full (governance — run rarely)

| Command | Meaning |
| --- | --- |
| **`pnpm typecheck:full`** | App + test + scripts TypeScript graphs |
| **`pnpm lint:full`** | Full Turbo lint stack (~18 governance tasks + repo ESLint) |
| **`pnpm gate:push`** | Pre-push gate: lint stack + typecheck:full + knip + test:ci + format (alias: `pnpm verify:parallel`) |
| **`pnpm gate:merge`** | Push gate + production `next build` |
| **`pnpm verify` / `pnpm verify:ci`** | CI sequential variant — unchanged for workflow compatibility |

#### Narrow (domain-specific — run when that domain changed)

Unchanged: `pnpm lint:drizzle-journal`, `pnpm lint:fixtures-parity`, `pnpm ask-docs:check`, renderer lint gates, etc. See AGENTS.md §2.

### Naming rules (for future scripts)

1. **No suffix** → safe for high-frequency IDE use (`gate`, `typecheck`, `lint:path`).
2. **`:full` suffix** → whole-repo or whole-graph governance (`typecheck:full`, `lint:full`).
3. **`gate:*` prefix** → tiered orchestration (`gate:push`, `gate:merge`) — not individual tools.
4. **Never alias `pnpm lint` to the edit loop** — `pnpm lint` remains **`lint:full`** for backward compatibility with CI and docs that mean “full governance lint”.

### Forbidden edit-loop habits

```txt
❌ pnpm lint && pnpm verify:parallel && pnpm build && pnpm test:e2e  (every save)
❌ pnpm exec eslint .   (full-repo ESLint)
❌ pnpm knip            (after every task — belongs in gate:push only)
❌ Running gate:push twice because lint:full was already run
```

---

## Consequences

### Positive

- IDE agents and humans share one mnemonic: **`pnpm gate -- <path>`** after tasks.
- Command names encode cost — reduces accidental 10-minute local CI replays.
- CI script names (`verify:ci`, `lint:full`) stay stable; new names are additive aliases.

### Negative / operational

- Two lint entry points to learn: **`lint:path`** (common) vs **`lint:full`** (rare).
- `pnpm gate` without paths skips ESLint — agents must pass paths for lint coverage.
- **`typecheck:full`** must run before push even when only app code changed (included in `gate:push`).

---

## Compliance

- **AGENTS.md §2** is the operator table; this ADR is the decision record.
- **`.cursor/rules/targeted-verification.mdc`** (always on) enforces L0 for concurrent agents.
- **`scripts/check-agent-contract.mjs`** — no change required; ADR is documentary unless promoted to required-files list later.

---

## Revision history

| Date | Change |
| ---- | ------ |
| 2026-05-20 | [ADR-0042](./0042-typescript-gate-performance.md) — `gate -- paths` lint-only; `gate:typecheck` before push |
| 2026-05-19 | `gate:help` + `gate:dry-run` for onboarding and L0 plan preview |
| 2026-05-19 | Initial acceptance — gate ladder, `gate` / `:full` naming, `scripts/gate.mjs` + `lint-path.mjs` |
