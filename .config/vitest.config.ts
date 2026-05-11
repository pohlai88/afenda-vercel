import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
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
    maxWorkers: 1,
    fileParallelism: false,
    setupFiles: ["./.config/vitest.setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
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
        // OneThing UI surfaces: exercised via Playwright E2E — they hydrate against the
        // DB-backed page composition (rank, audit, lynx grounding) and Server Actions, so unit
        // isolation would mock away the whole behavior. Pure helpers (`onething-rank.shared`,
        // `onething-page-view.shared`, schema parsers, title classifier) stay unit-covered.
        "lib/features/onething/components/onething-shell.tsx",
        "lib/features/onething/components/onething-list-pane.tsx",
        "lib/features/onething/components/onething-detail-pane.tsx",
        "lib/features/onething/components/onething-detail-toolbar.tsx",
        "lib/features/onething/components/onething-detail-composer.tsx",
        "lib/features/onething/components/onething-detail-empty.tsx",
        "lib/features/onething/components/onething-detail-audit-footer.tsx",
        "lib/features/onething/components/onething-page.tsx",
        "lib/features/onething/components/personal-onething-page.tsx",
        "lib/features/onething/components/hooks/use-flip.ts",
        "lib/features/onething/components/hooks/use-focus-navigation.ts",
        "lib/features/onething/components/hooks/use-resolve-with-focus-handoff.ts",
        "lib/features/onething/components/hooks/use-onething-draft-persistence.ts",
        // useNow + useViewedIds are React-only client hooks (DOM, localStorage,
        // useSyncExternalStore). Their behavior is covered by the Playwright
        // smoke spec; unit isolation would mock away the only thing they do.
        "lib/features/onething/components/hooks/use-now.ts",
        "lib/features/onething/components/hooks/use-viewed-ids.ts",
        // Sign-out cleanup runs in the browser against `localStorage`; the
        // canonical sign-out flow is exercised end-to-end by `auth-public-shell`
        // / `onething-smoke` Playwright specs. The pure helpers
        // `pickNextRankedId` and `splitOneThingDraft` still contribute to
        // coverage from `tests/unit/onething/onething-shell-helpers.test.ts`.
        "lib/features/onething/components/onething-client-storage.ts",
        // HRM workforce: Server Actions + Drizzle queries + RSC/client islands;
        // unit tests cover schemas, path sanitizer, registry; Playwright `hrm-workforce-isolation.spec.ts`.
        "lib/features/hrm/actions/**",
        "lib/features/hrm/data/**",
        "lib/features/hrm/components/**/*.tsx",
      ],
      // Ratchet global executed coverage toward 80%; keep coverage.all off until breadth grows.
      // Global floors track what Vitest currently executes from unit imports (lib/auth barrel drags many server modules).
      thresholds: {
        statements: 51,
        branches: 39,
        lines: 52,
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
