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
 * - Parallelism: **Windows only** — `forks` + `maxWorkers: 1` + `fileParallelism: false` when running
 *   with coverage (V8 NTFS file-locking constraint; see https://main.vitest.dev/guide/improving-performance).
 *   Linux/macOS CI runs coverage in parallel: `forks` + `maxWorkers: 4`.
 *   Without `--coverage` + `run`, uses `forks` with Vitest defaults (parallel files + CPU-scaled workers).
 * - **`dir` + `include`**: discovery scoped to `tests/unit` (Vitest "Improving performance" — less root scanning).
 * - **`experimental.fsModuleCache`**: persists transform cache between watch sessions (no effect on one-shot `vitest run`).
 */
import os from "node:os"
import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

const workspaceRoot = path.resolve(import.meta.dirname, "..")

process.env.DATABASE_URL ??= "postgresql://vitest:vitest@127.0.0.1:5432/vitest"
process.env.NEON_AUTH_BASE_URL ??= "https://vitest.neonauth.example/neondb/auth"
process.env.NEON_AUTH_COOKIE_SECRET ??=
  "dGVzdHNlY3JldHRlc3RzZWNyZXR0ZXN0c2VjcmV0dGVzdA=="

/**
 * Windows-only serial mode: V8 coverage uses a file-per-worker JSON strategy that races on
 * NTFS rename/read. On Linux/macOS, multiple forks can write to separate files safely.
 * See https://main.vitest.dev/guide/improving-performance for the official recommendation.
 */
function vitestArgvRunsOnce(): boolean {
  return process.argv.includes("run")
}

const runOnce = vitestArgvRunsOnce()
const isWindows = process.platform === "win32"

export default defineConfig({
  root: workspaceRoot,
  resolve: {
    tsconfigPaths: true,
    /** Single `next` instance so `next-intl` does not resolve a nested peer without Vitest stubs. */
    dedupe: ["next", "react", "react-dom"],
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
      "next-intl/navigation": path.resolve(
        import.meta.dirname,
        "../tests/stubs/next-intl-navigation.ts"
      ),
      "server-only": path.resolve(
        import.meta.dirname,
        "../tests/stubs/server-only.ts"
      ),
    },
  },
  plugins: [react()],
  test: {
    environment: "node",
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgresql://vitest:vitest@127.0.0.1:5432/vitest",
      NEON_AUTH_BASE_URL:
        process.env.NEON_AUTH_BASE_URL ??
        "https://vitest.neonauth.example/neondb/auth",
      NEON_AUTH_COOKIE_SECRET:
        process.env.NEON_AUTH_COOKIE_SECRET ??
        "dGVzdHNlY3JldHRlc3RzZWNyZXR0ZXN0c2VjcmV0dGVzdA==",
    },
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
    // Serial mode is a Windows-only constraint (V8 NTFS file-locking).
    // On Linux CI, run coverage in parallel with 4 workers for a 3-5x speedup.
    ...(isWindows
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
      // Parallel V8 report processing. Vitest default is Math.min(20, availableParallelism).
      // Cap at 4 to avoid OOM on smaller CI runners without sacrificing throughput.
      // Node 24 always exposes os.availableParallelism() — more accurate than cpus().length.
      processingConcurrency: Math.min(os.availableParallelism(), 4),
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
        "lib/features/hrm/**/actions/**",
        "lib/features/hrm/**/data/**",
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
