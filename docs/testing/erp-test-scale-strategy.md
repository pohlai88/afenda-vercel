# ERP test scale strategy

Canonical guide for growing Afenda from today's HRM-heavy workspace to full ERP without collapsing the developer test loop. Complements [ADR-0008](../decisions/0008-vitest-nextjs-unit-test-configuration.md), [ADR-0033](../decisions/0033-verify-gate-ladder-naming.md), [vitest-wsl-coverage.md](./vitest-wsl-coverage.md), and `.cursor/rules/testing.mdc`.

## Decision summary

1. **Do not** embed Vitest or `/api/test/*` hooks in the Next.js runtime — simulation and Playwright cover integration fidelity.
2. **Do** keep a tiered pyramid: Vitest contracts → operational simulation → Playwright → ops probes.
3. **Do** optimize Vitest via import graph, projects, caching, and CI sharding — not by running tests inside `next dev`.

---

## Test pyramid and clocks

```txt
T0 (seconds)     pnpm test:changed · pnpm test:fast:node -- tests/unit/<module>
T0 module          pnpm test:fast:pure · test:fast:dom when RTL touched
T1 local batch     pnpm test:fast (warm ~3–5 min today)
T1 CI parallel     3× test:ci:shard + merge (~90s wall on Linux)
T2 pre-merge       test:ci + coverage (WSL on Windows — see vitest-wsl-coverage.md)
T3 nightly         full Playwright (not only @smoke)
T4 production      cron probes only — not business-rule matrices
```

| Layer | Tool | What to test | What to skip |
| --- | --- | --- | --- |
| Unit (node) | Vitest `unit-node` | Schemas, parsers, path builders, rule packs, permissions | `actions/**`, `data/**`, full RSC |
| Unit (pure) | Vitest `unit-pure` (`isolate: false`) | Stateless Zod/schema tests — `*.pure.test.ts` only | Anything with `vi.mock` / `vi.resetModules` |
| Unit (DOM) | Vitest `unit-dom` (`happy-dom`) | RTL — `*.dom.test.tsx` only | Server barrels, async RSC pages |
| Simulation | `#features/simulation` | Cross-module workflows, audit provenance | Every CRUD field |
| E2E | Playwright `@smoke` on PR | Locale, auth shell, one golden path per capability | Per-field form coverage |
| Ops | Cron `erp.probe` | DB reachability | ERP business rules |

---

## Developer habits (T0 — mandatory)

| Moment | Command |
| --- | --- |
| While editing | `pnpm test:changed` |
| Touched schemas only | `pnpm test:fast:pure` |
| No DOM / RTL | `pnpm test:fast:node -- tests/unit/<area>` |
| Before push (no coverage) | `pnpm test:fast` |
| Before push (coverage) | WSL: `pnpm test:ci` |
| After failure | `pnpm test:failures` |

Never use full `pnpm test:ci` as the default edit-loop on Windows (serial coverage on NTFS).

---

## Per-module budgets (100% ERP)

When adding a capability (e.g. row in `HRM_CAPABILITIES`):

| Artifact | Budget |
| --- | --- |
| Vitest unit files | ≤ 10–15 per capability (prefer `*.pure.test.ts` for Zod-only) |
| Simulation scenario | 1 per **money-path** workflow (register in `scenario-registry.server.ts`) |
| Playwright | 1 `@smoke` spec per capability |
| Forbidden | `/api/test/*`, in-app test runner, Vitest inside `next dev` |

**Sublinear growth:** reuse list-surface builders, schema tests, and shared fixtures — do not duplicate server action tests in Vitest (excluded from coverage; use E2E/simulation).

---

## Runtime verification (not Vitest-in-runtime)

| Mechanism | Env / entry | Use when |
| --- | --- | --- |
| Operational simulation | `AFENDA_ENABLE_SIMULATION=1` | Replay scenario graphs; real Server Actions + stamped `audit_origin` |
| `pnpm simulate:replay` / `simulate:clear` | CLI | Local/staging scenario runs |
| `pnpm dev:stack` | UI 3000, WDK 3002 | Durable workflow DevKit tests |
| Playwright | `next start` :3001 | Async RSC, cookies, locale routing |
| Cron probes | `erp-jobs` route | Deploy health only |

### Simulation registry rule

For each new cross-cutting workflow (payroll finalize, import job, org switch):

1. Add graph under `lib/features/simulation/data/scenario-graphs/`.
2. Register in [`lib/features/simulation/data/scenario-registry.server.ts`](../../lib/features/simulation/data/scenario-registry.server.ts).
3. Do **not** add production routes that expose test runners.

---

## Vitest performance ladder

See [Vitest — Improving performance](https://vitest.dev/guide/improving-performance).

### Already enabled in repo

- `pool: threads` for `test:fast`
- Projects: `unit-node`, `unit-pure`, `unit-dom`
- `experimental.fsModuleCache` on `test:fast` reruns
- `cacheDir` → `.artifacts/vitest-vite/`
- `deps.optimizer.ssr` prebundle
- CI: 3 shards + blob merge
- `pnpm test:analyze:imports*` → `experimental.importDurations`

### Import diet (main bottleneck)

~60% of wall time is transform/import, not test bodies.

```bash
pnpm test:analyze:imports:report -- tests/unit/hrm
pnpm test:analyze:imports:warn    # print breakdown when import > 100ms
```

Fixes:

- Import `#features/<module>/client` or `schemas/`, not server `index.ts` (ADR-0030).
- Prefer `*.pure.test.ts` for Zod-only specs (runs in `unit-pure` with `isolate: false`).

### Projects

| Project | Files | Environment | Isolation |
| --- | --- | --- | --- |
| `unit-pure` | `**/*.pure.test.ts` | node | `false` |
| `unit-node` | `**/*.test.ts(x)` except dom/pure | node | `true` (default) |
| `unit-dom` | `**/*.dom.test.{ts,tsx}` | happy-dom | `true` |

**Do not** set global `isolate: false` — breaks mock/`vi.resetModules` suites.

### CI scaling

| Unit files | Action |
| --- | --- |
| Today (~360) | 3 shards (current) |
| > 500 | Bump matrix to `4/4` shards in `.github/workflows/ci.yml` |
| Docs-only PR | `vitest-gate` job skips shards (paths-filter) |

### Local multi-shard (high-core machines)

Vitest runs one Vite server per process; on 32+ logical CPUs, split load:

```bash
pnpm test:local-shards
```

See [`scripts/test-local-shards.mjs`](../../scripts/test-local-shards.mjs) — same pattern as [vitest-tests/test-sharding](https://github.com/vitest-tests/test-sharding).

Env: `VITEST_MAX_WORKERS=7` per shard (override as needed).

---

## Growth model (order of magnitude)

| ERP surface | Unit files | CI Vitest wall | Simulation scenarios | E2E smoke |
| --- | --- | --- | --- | --- |
| Today | ~360 | ~90s (3 shards) | Few | ~38 |
| 2× modules | ~600 | ~2 min (4 shards) | +15–25 | ~70 |
| Full ERP | ~800 | ~2–3 min (4–5 shards) | ~40–60 | ~100–120 |

Developer T0 stays **seconds** if `test:changed` remains the default.

---

## Forbidden patterns

- Vitest runner inside `AppShell`, org layout, or `/api/test/*`
- Replacing statutory golden tests with live payroll API calls in dev
- Global `isolate: false` on all projects
- Full `test:ci` on every file save
- E2E per screen / per form field

---

## TypeScript compile

Keep **`pnpm typecheck`** on the app graph and **`pnpm typecheck:test`** on the test graph — see [typescript-compile-efficiency.md](./typescript-compile-efficiency.md).

## Related commands

| Command | Purpose |
| --- | --- |
| `pnpm test:changed` | Git-changed tests (T0) |
| `pnpm test:fast` | Full suite, no coverage |
| `pnpm test:fast:node` / `:dom` / `:pure` | Single project |
| `pnpm test:ci:shard` | CI shard (`SHARD=1/3`) |
| `pnpm test:local-shards` | Local 4-process shard + merge |
| `pnpm test:analyze:imports:report` | Import duration artifact |
