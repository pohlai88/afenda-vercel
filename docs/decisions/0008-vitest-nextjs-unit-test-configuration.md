# ADR-0008 — Canonical Vitest configuration for Next.js (App Router) unit tests

| Field                  | Value                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**             | Accepted                                                                                                                                                                                                                                                                                                                                                                                    |
| **Date**               | 2026-05-12                                                                                                                                                                                                                                                                                                                                                                                  |
| **Supersedes**         | Ad hoc or copy-paste Vitest setups that assume a root-level `vitest.config.*`, global `jsdom`, Vitest 3-style `poolOptions`, or optional `vite-tsconfig-paths` without documenting why.                                                                                                                                                                                                     |
| **Does not supersede** | **Playwright** as the gate for **async** Server Components and full route flows ([Next.js: Vitest](https://nextjs.org/docs/app/guides/testing/vitest) explicitly recommends E2E for async RSC). **AGENTS.md** testing directory contract (file naming, fixtures, coverage ratchet targets). **ADR-0007** Turborepo task graph for `test:ci` (cache outputs under `.artifacts/coverage/**`). |
| **Implements in code** | [`.config/vitest.config.ts`](../../.config/vitest.config.ts) · [`.config/vitest.setup.ts`](../../.config/vitest.setup.ts) · [`scripts/with-env.mjs`](../../scripts/with-env.mjs) (coverage `.tmp` mkdir + warning comment) · [`package.json`](../../package.json) scripts (`test`, `test:fast`, `test:ci`, `test:coverage`, `lint:fixtures-parity`)                                         |
| **Related docs**       | [Next.js: How to set up Vitest with Next.js](https://nextjs.org/docs/app/guides/testing/vitest) · [Vitest configuration](https://vitest.dev/config/) · [Vitest 4 migration (pool rework)](https://vitest.dev/guide/migration#pool-rework)                                                                                                                                                   |

---

## 1. Context

Next.js documents a **minimal** Vitest setup: `defineConfig` from `vitest/config`, `@vitejs/plugin-react`, `environment: 'jsdom'`, and (for TypeScript) the **`vite-tsconfig-paths`** plugin so `tsconfig` path aliases resolve.

This repository already diverged in intentional ways:

- **Config location** — Vitest config and setup live under **`.config/`** with **`--config .config/vitest.config.ts`** in scripts, matching other tooling (`eslint`, `playwright`, `knip`, `drizzle`) and keeping the repo root small (**AGENTS.md** §6).
- **Environment split** — Most unit tests are **pure Node** (schemas, parsers, auth helpers, org-admin contracts). Only a **small** set of **React Testing Library** specs need **jsdom**. A global `jsdom` environment wastes time and memory on every file.
- **Next.js imports in Node** — Tests pull modules that transitively import **`next/headers`** and **`next/navigation`**. Those APIs are not available in Vitest’s Node runner; the config therefore **aliases** them to **[`tests/stubs/`](../../tests/stubs/)** shims and **inlines** selected packages via `server.deps.inline` so aliases apply inside dependency graphs (see comments in [`.config/vitest.config.ts`](../../.config/vitest.config.ts)).
- **Vitest 4** — **`test.poolOptions` was removed**; fork/thread tuning must use **top-level `test` options** (`pool`, `maxWorkers`, `fileParallelism`, `execArgv`, `isolate`, `vmMemoryLimit`, etc.). **`singleFork`** is **not** a Vitest 4.1 config field; use **`maxWorkers: 1`** and **`fileParallelism: false`** when a single worker sequence is required (e.g. **v8 coverage** stability on Windows). Non-coverage runs omit those limits so **`pnpm test`** / **`test:fast`** stay fast.
- **TypeScript paths** — Vite **6** / Vitest **4** support **`resolve.tsconfigPaths: true`**, which replaces the extra **`vite-tsconfig-paths`** dependency used in older examples. Adding both without cause duplicates resolution logic.
- **Coverage output** — Reports and v8 merge temps live under **`.artifacts/coverage/`** (including **`.tmp`** shards). External scripts must **not** delete **`.tmp`** mid-run; **`scripts/with-env.mjs`** only ensures the directory exists. Parallel **unrelated** Vitest processes must not share the same **`coverage.reportsDirectory`**.
- **Turbo + `test:ci`** — [**ADR-0007**](0007-turborepo-single-package-verify-cache.md) caches **`test:ci`** outputs. Coverage races remain an **operational** risk if multiple processes fight the same `.tmp` tree; the Vitest config intentionally limits worker parallelism.

Without a single ADR, future edits risk “fixing” the setup toward the Next.js quickstart **verbatim** (root config, global jsdom, `vite-tsconfig-paths`, or Vitest 3 **`poolOptions`**), reintroducing deprecation warnings, slower runs, or flaky coverage.

---

## 2. Decision

### 2.1 Single canonical config

- **` .config/vitest.config.ts`** is the **only** Vitest config. Do **not** add a second root **`vitest.config.*`** unless **AGENTS.md** and this ADR are updated to explain which entry points use which file.
- **`root`** in the config must resolve to the **repository root** (`path.resolve(import.meta.dirname, "..")` from `.config/`) so paths behave like a root-level config when the process **`cwd`** varies.
- **`setupFiles`** must reference **`.config/vitest.setup.ts`** via an absolute path anchored to that **`workspaceRoot`** so setup always loads.

### 2.2 Alignment with Next.js — and deliberate deltas

| Next.js guide (baseline)              | This repo (locked decision)                                                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugins: [tsconfigPaths(), react()]` | `plugins: [react()]` **plus** `resolve: { tsconfigPaths: true }` (no `vite-tsconfig-paths` package).                                                                                         |
| `test.environment: 'jsdom'`           | **Vitest projects:** `unit-pure` (`*.pure.test.ts`, `isolate: false`) + `unit-node` (`node`) + `unit-dom` (`happy-dom`). DOM specs use **`*.dom.test.{ts,tsx}`** only.                                                  |
| `vitest.config.mts` at repo root      | **`.config/vitest.config.ts`**; all **`package.json`** Vitest invocations pass **`--config .config/vitest.config.ts`**.                                                                      |
| —                                     | **`resolve.alias`** for **`next/headers`** and **`next/navigation`** → **`tests/stubs/`**.                                                                                                   |
| —                                     | **`coverage.reportsDirectory`**: `./.artifacts/coverage` · When **`--coverage`** is present: **`maxWorkers: 1`**, **`fileParallelism: false`**, **`pool: 'forks'`** for stable **`test:ci`** / v8 merges (especially Windows). Without **`--coverage`** (local **`pnpm test`** / **`test:fast`**): **`pool: 'forks'`** with Vitest defaults for parallel files + workers (process isolation for DOM specs). |

### 2.3 Vitest 4 pool and coverage

- Do **not** reintroduce **`poolOptions`** (removed in Vitest 4; emits deprecation warnings).
- Prefer **documented** top-level **`test`** fields from the [migration guide](https://vitest.dev/guide/migration#pool-rework).
- If coverage **ENOENT** / “Something removed the coverage directory **`.tmp`**” appears, treat it as **concurrency or external cleanup** — not a signal to revert to Vitest 3 APIs. Confirm only one Vitest **`--coverage`** run owns **`.artifacts/coverage`** at a time.

### 2.4 `with-env` and DATABASE / Neon stubs

- **`scripts/with-env.mjs`** merges **`.env.local`** for **`vitest`**/**`playwright`** only (**AGENTS.md** §2). **`vitest.setup.ts`** provides minimal **`NEON_*`** and **`DATABASE_URL`** defaults so **`#lib/db`** imports do not throw in isolation.

---

## 3. Consequences

### Positive

- One documented place explains **why** the setup differs from **`create-next-app` with-vitest**.
- Deprecation-safe **Vitest 4** pool configuration.
- Faster **Node-first** suite; jsdom only where RTL is required.

### Negative / constraints

- New contributors may expect global **jsdom** — they must follow **`*.dom.test.tsx`** + pragma convention (**AGENTS.md**).
- **Async RSC** remains **Playwright’s** job; Vitest unit tests must not pretend to render full **`async function Page()`** trees in isolation.

---

## 4. Compliance

- **AGENTS.md** §2 and **Testing directory contract** link to this ADR.
- **`.cursor/rules/testing-directory.mdc`** may mirror coverage/config paths and this ADR for editors with rules enabled.
- Changes that **move** the config file, **remove** `root` / stub aliases, or **reintroduce** deprecated Vitest APIs should be rejected unless this ADR is superseded.

---

## 5. Revision history

| Date       | Change                                                                                                    |
| ---------- | --------------------------------------------------------------------------------------------------------- |
| 2026-05-14 | **`test.dir`** = `tests/unit` + relative **`include`** (faster discovery); **`experimental.fsModuleCache`** for watch reruns; **`pnpm test:analyze:imports*`** scripts use Vitest import-duration instrumentation. |
| 2026-05-20 | **Speed/cache:** `cacheDir` → `.artifacts/vitest-vite/`; `fsModuleCache` on `test:fast` reruns; `threads` pool; split `vitest.setup.shared.ts` / `vitest.setup.dom.ts`; `deps.optimizer.ssr` prebundles. **`isolate: false` rejected** (mock/`vi.resetModules` bleed). |
| 2026-05-20 | **Vitest projects:** `unit-node` (default Node) + `unit-dom` (`*.dom.test.{ts,tsx}` + `jsdom`). RTL specs renamed to `*.dom.test.tsx`; use `pnpm test:fast:node` / `:dom`. WSL coverage: `docs/testing/vitest-wsl-coverage.md`. Import audit: `pnpm test:analyze:imports:report` → `.artifacts/vitest-import-durations.txt`. |
| 2026-05-20 | **ERP test scale + perf:** `unit-pure` project (`**/*.pure.test.ts`, `isolate: false`); `unit-dom` uses **happy-dom**; schema tests renamed to `*.pure.test.ts`; Turbo **`test:fast`** cache; CI **`vitest-gate`** paths-filter; `pnpm test:local-shards`; docs [erp-test-scale-strategy.md](../testing/erp-test-scale-strategy.md). |
| 2026-05-20 | **Windows fix:** serial **`maxWorkers: 1`** only when **`vitest run --coverage`** (was incorrectly applied to all Windows runs, slowing **`test:fast`** ~3–5×). Non-coverage Windows runs use default parallelism. |
| 2026-05-14 | Conditional workers: without **`--coverage`**, **`forks`** + default **`maxWorkers`** / **`fileParallelism`** for faster local runs; **`--coverage`** keeps **`maxWorkers: 1`** + **`fileParallelism: false`** on Windows. Linux/macOS **`--coverage`** uses **`maxWorkers: 4`**. |
| 2026-05-12 | Initial acceptance — codifies `.config/` Vitest + Next.js alignment and Vitest 4 pool/coverage discipline |
