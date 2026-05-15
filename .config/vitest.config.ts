/**
 * Vitest + Next.js (App Router) — canonical contract: `docs/decisions/0008-vitest-nextjs-unit-test-configuration.md`.
 * Also aligned with:
 * - Next.js: https://nextjs.org/docs/app/guides/testing/vitest (`@vitejs/plugin-react`, jsdom for DOM tests)
 * - Vitest 4: https://vitest.dev/config/ (no `poolOptions`; optional `pool` / `maxWorkers`)
 *
 * Deviations from the Next.js quickstart:
 * - Config lives in `.config/`; scripts pass `--config .config/vitest.config.ts`.
 * - `root` is the repo root so resolution matches a root-level `vitest.config` when cwd varies.
 * - `resolve.tsconfigPaths: true` replaces `vite-tsconfig-paths()` (Vite 6 / Vitest 4 native).
 * - Default `environment: "node"` for fast unit tests; `*.dom.test.tsx` use `// @vitest-environment jsdom`
 *   (Next.js uses `jsdom` globally — we avoid loading jsdom for non-DOM suites).
 * - `next/headers` / `next/navigation` are stubbed for imports outside the Next.js runtime.
 * - Parallelism: **`--coverage`** → **`forks`** + **`maxWorkers: 1`** + **`fileParallelism: false`**
 *   (v8 / Windows). Otherwise **`forks`** + Vitest defaults (parallel files + workers).
 * - **`dir` + `include`**: discovery scoped to `tests/unit` (Vitest “Improving performance” — less root scanning).
 * - **`experimental.fsModuleCache`**: persists transform cache between watch sessions (no effect on one-shot `vitest run`).
 */
import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const workspaceRoot = path.resolve(import.meta.dirname, "..")

/**
 * v8 coverage merge + Windows stability: with **`--coverage`**, use **`forks`** +
 * **`maxWorkers: 1`** + **`fileParallelism: false`**. Without **`--coverage`**, use
 * **`forks`** with Vitest defaults (parallel test files + CPU-scaled workers) so
 * DOM suites stay process-isolated while **`pnpm test`** / **`test:fast`** speed up.
 */
function vitestArgvCollectsCoverage(): boolean {
  return process.argv.some(
    (arg) => arg === "--coverage" || arg.startsWith("--coverage=")
  )
}

function vitestArgvRunsOnce(): boolean {
  return process.argv.includes("run")
}

const collectCoverage = vitestArgvCollectsCoverage()
const runOnce = vitestArgvRunsOnce()

export default defineConfig({
  root: workspaceRoot,
  resolve: {
    tsconfigPaths: true,
    alias: {
      /**
       * `@neondatabase/auth/next/server` imports `next/headers` from its own peer
       * `node_modules/next` which doesn't resolve in a Node.js test environment.
       * `next-intl`'s development ESM build imports `next/navigation` from its own
       * peer `node_modules/next` which also doesn't resolve there.
       * Redirect both to project-root stubs so all consumers get consistent mocks.
       *
       * `import.meta.dirname` = .config/ — go up one level to reach project root.
       */
      "next/headers": path.resolve(
        import.meta.dirname,
        "../tests/stubs/next-headers.ts"
      ),
      "next/navigation": path.resolve(
        import.meta.dirname,
        "../tests/stubs/next-navigation.ts"
      ),
    },
  },
  plugins: [react()],
  test: {
    environment: "node",
    testTimeout: 20_000,
    hookTimeout: 20_000,
    /** Discovery root — `include` globs are relative to this directory. */
    dir: path.join(workspaceRoot, "tests/unit"),
    include: ["**/*.test.{ts,tsx}"],
    experimental: {
      /**
       * Keep the persistent transform cache for watch mode only. In one-shot
       * Windows fork runs it races on rename/read inside node_modules/.experimental-vitest-cache.
       */
      fsModuleCache: !runOnce,
    },
    ...(collectCoverage
      ? {
          pool: "forks" as const,
          maxWorkers: 1,
          fileParallelism: false,
        }
      : runOnce
        ? {
            pool: "forks" as const,
            maxWorkers: 4,
          }
        : {
            pool: "forks" as const,
          }),
    server: {
      deps: {
        /**
         * Force Vite to transform `@neondatabase/auth` so that the
         * `resolve.alias` for `next/headers` applies inside that package's
         * ESM import chain — otherwise Node loads it natively and the alias
         * is skipped, causing "Cannot find module 'next/headers'" errors.
         */
        inline: [
          /@neondatabase\/auth/,
          // Bundle next-intl so `resolve.alias` for `next/navigation` applies (Vitest Node).
          /next-intl/,
        ],
      },
    },
    setupFiles: [path.join(workspaceRoot, ".config/vitest.setup.ts")],
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
    sequence: { shuffle: false },
    coverage: {
      provider: "v8",
      /** Let Vitest delete prior reports/.tmp on startup — do not rm externally (Windows races). */
      clean: true,
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "./.artifacts/coverage",
      exclude: [
        "**/*.d.ts",
        "**/*.{config,setup}.*",
        "**/schema.generated.ts",
        "tests/**",
        // Lynx NL→SQL demo: exercised via Playwright / manual smoke; actions tie to DB + AI.
        "lib/features/lynx/actions/nl-sql-demo.actions.ts",
        "lib/features/lynx/components/nl-sql-demo-client.tsx",
        "lib/features/lynx/components/nl-sql-demo-dynamic-chart.tsx",
        "lib/features/lynx/components/lynx-page.tsx",
        "lib/features/lynx/components/truth-search-client.tsx",
        "lib/features/lynx/data/nl-sql-demo-prompt.server.ts",
        // Workflow DevKit entrypoints: exercised via integration/E2E + runtime; not Vitest-isolated.
        "lib/features/org-admin/data/import-job-run.workflow.ts",
        "lib/features/execution/data/import-job-run-entry.ts",
        "lib/features/execution/index.ts",
        // HRM workforce: Server Actions + Drizzle queries + RSC/client islands;
        // unit tests cover schemas, path sanitizer, registry; Playwright `hrm-workforce-isolation.spec.ts`.
        "lib/features/hrm/actions/**",
        "lib/features/hrm/data/**",
        "lib/features/hrm/components/**/*.tsx",
        // Planner: Server Actions + modules under `commands/` + IO-heavy `data/` (ADR-0006 / ADR-0008).
        // Same doctrine as HRM `actions/**` + `data/**`: mutation + DB graphs are Playwright / runtime gates;
        // Vitest still runs `tests/unit/planner/planner-capture-parser.test.ts` for capture parsing behavior.
        "lib/features/planner/commands/**",
        "lib/features/planner/data/**",
        // Orbit surface UI + client islands — Playwright / RSC routes; unit tests mock `#features/planner/server`.
        "lib/features/planner/views/**",
        // Governed ERP list/detail shells — Playwright / runtime.
        "lib/features/governed-surface/**",
      ],
      // Ratchet global executed coverage toward 80%; keep coverage.all off until breadth grows.
      // Global floors track what Vitest executes from unit imports after the excludes above (ADR-0008).
      thresholds: {
        statements: 47,
        branches: 38,
        lines: 48,
        functions: 39,
        "lib/auth/**/*.shared.ts": {
          statements: 95,
          branches: 95,
          lines: 95,
          functions: 95,
        },
        "lib/auth/callback-path.ts": {
          statements: 95,
          branches: 95,
          lines: 95,
          functions: 95,
        },
      },
    },
  },
})
