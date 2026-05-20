/**
 * Vitest + Next.js (App Router) — canonical contract: `docs/decisions/0008-vitest-nextjs-unit-test-configuration.md`.
 *
 * Three projects (`unit-pure` | `unit-node` | `unit-dom`): pure schemas run with isolate:false; DOM uses happy-dom.
 * Speed: Vite `cacheDir`, `experimental.fsModuleCache` on test:fast reruns, `threads` pool, split setup files.
 * WSL coverage guide: `docs/testing/vitest-wsl-coverage.md`.
 */
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

import {
  buildCoverageConfig,
  buildVitestPoolOptions,
  sharedResolve,
  sharedTestEnv,
  unitTestDir,
  vitestArgvHasAudit,
  vitestSetupDom,
  vitestSetupShared,
  vitestViteCacheDir,
  workspaceRoot,
} from "./vitest.shared"

process.env.DATABASE_URL ??= "postgresql://vitest:vitest@127.0.0.1:5432/vitest"
process.env.NEON_AUTH_BASE_URL ??= "https://vitest.neonauth.example/neondb/auth"
process.env.NEON_AUTH_COOKIE_SECRET ??=
  "dGVzdHNlY3JldHRlc3RzZWNyZXR0ZXN0c2VjcmV0dGVzdA=="

const withAudit = vitestArgvHasAudit()

export default defineConfig({
  root: workspaceRoot,
  cacheDir: vitestViteCacheDir,
  resolve: sharedResolve,
  plugins: [react()],
  test: {
    env: sharedTestEnv,
    testTimeout: 20_000,
    hookTimeout: 20_000,
    experimental: {
      // Off by default: fsModuleCache races with drizzle-orm `vi.importActual` on Windows (ADR-0008).
      fsModuleCache: false,
    },
    ...buildVitestPoolOptions(),
    // SSR pre-bundle disabled: breaks `vi.importActual("drizzle-orm")` on Windows (ADR-0008).
    deps: {
      optimizer: {
        ssr: {
          enabled: false,
        },
      },
    },
    server: {
      deps: {
        inline: [/@neondatabase\/auth/, /next-intl/, /drizzle-orm/],
      },
    },
    passWithNoTests: true,
    clearMocks: true,
    restoreMocks: true,
    sequence: { shuffle: false },
    ...(withAudit
      ? {
          silent: "passed-only" as const,
          hideSkippedTests: true,
        }
      : {}),
    coverage: buildCoverageConfig(),
    projects: [
      {
        extends: true,
        test: {
          name: "unit-pure",
          dir: unitTestDir,
          environment: "node",
          isolate: false,
          include: ["**/*.pure.test.ts"],
          setupFiles: [vitestSetupShared],
        },
      },
      {
        extends: true,
        test: {
          name: "unit-node",
          dir: unitTestDir,
          environment: "node",
          include: ["**/*.test.ts", "**/*.test.tsx"],
          exclude: ["**/*.dom.test.{ts,tsx}", "**/*.pure.test.ts"],
          setupFiles: [vitestSetupShared],
        },
      },
      {
        extends: true,
        test: {
          name: "unit-dom",
          dir: unitTestDir,
          environment: "happy-dom",
          include: ["**/*.dom.test.{ts,tsx}"],
          setupFiles: [vitestSetupDom],
        },
      },
    ],
  },
})
