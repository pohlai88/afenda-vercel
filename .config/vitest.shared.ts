import os from "node:os"
import path from "node:path"
import type { CoverageOptions } from "vitest/node"

/** Narrow pool slice for spread into `test` — avoids `Record<string, unknown>`. */
type VitestPoolOptions = {
  pool?: "forks" | "threads"
  maxWorkers?: number
  fileParallelism?: boolean
}

export const workspaceRoot = path.resolve(import.meta.dirname, "..")

export const unitTestDir = path.join(workspaceRoot, "tests/unit")

/** Vite transform cache (safe under .artifacts — gitignored). */
export const vitestViteCacheDir = path.join(
  workspaceRoot,
  ".artifacts/vitest-vite"
)

export const vitestSetupShared = path.join(
  import.meta.dirname,
  "vitest.setup.shared.ts"
)

export const vitestSetupDom = path.join(
  import.meta.dirname,
  "vitest.setup.dom.ts"
)

export function vitestArgvRunsOnce(): boolean {
  return process.argv.includes("run")
}

export function vitestArgvHasCoverage(): boolean {
  return process.argv.includes("--coverage")
}

export function vitestArgvHasAudit(): boolean {
  return process.env.VITEST_AUDIT === "1"
}

export function buildFsModuleCacheEnabled(): boolean {
  const runOnce = vitestArgvRunsOnce()
  const withCoverage = vitestArgvHasCoverage()
  if (!runOnce) return true
  if (withCoverage) return false
  if (process.env.VITEST_FS_CACHE === "0") return false
  if (process.env.VITEST_FS_CACHE === "1") return true
  // Default on for test:fast reruns (disable with VITEST_FS_CACHE=0 if NTFS races appear).
  return true
}

export function buildVitestPoolOptions(): VitestPoolOptions {
  const runOnce = vitestArgvRunsOnce()
  const withCoverage = vitestArgvHasCoverage()
  const isWindows = process.platform === "win32"
  const poolOverride = process.env.VITEST_POOL
  const maxWorkersEnv = process.env.VITEST_MAX_WORKERS
  const maxWorkersParsed =
    maxWorkersEnv !== undefined && maxWorkersEnv !== ""
      ? Number.parseInt(maxWorkersEnv, 10)
      : undefined
  const maxWorkers =
    maxWorkersParsed !== undefined && !Number.isNaN(maxWorkersParsed)
      ? maxWorkersParsed
      : undefined

  const windowsCoverageSerial = isWindows && withCoverage && runOnce
  const posixCoverageParallel = !isWindows && withCoverage && runOnce

  const withMaxWorkers = (base: VitestPoolOptions): VitestPoolOptions =>
    maxWorkers !== undefined ? { ...base, maxWorkers } : base

  if (windowsCoverageSerial) {
    return withMaxWorkers({
      pool: "forks" as const,
      maxWorkers: maxWorkers ?? 1,
      fileParallelism: false,
    })
  }

  if (posixCoverageParallel) {
    return withMaxWorkers({
      pool: "forks" as const,
      maxWorkers: maxWorkers ?? 4,
    })
  }

  if (poolOverride === "forks" || poolOverride === "threads") {
    return withMaxWorkers({ pool: poolOverride })
  }

  // Non-coverage one-shot: threads + shared modules (isolate off on unit-node project).
  if (runOnce && !withCoverage) {
    return withMaxWorkers({ pool: "threads" as const })
  }

  return withMaxWorkers({ pool: "forks" as const })
}

export const sharedResolve = {
  tsconfigPaths: true,
  dedupe: ["next", "react", "react-dom"],
  alias: {
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
}

export const sharedTestEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://vitest:vitest@127.0.0.1:5432/vitest",
  NEON_AUTH_BASE_URL:
    process.env.NEON_AUTH_BASE_URL ??
    "https://vitest.neonauth.example/neondb/auth",
  NEON_AUTH_COOKIE_SECRET:
    process.env.NEON_AUTH_COOKIE_SECRET ??
    "dGVzdHNlY3JldHRlc3RzZWNyZXR0ZXN0c2VjcmV0dGVzdA==",
}

export function buildCoverageConfig(): CoverageOptions {
  return {
    provider: "v8",
    clean: true,
    reporter: ["text", "json-summary", "lcov"],
    reportsDirectory: "./.artifacts/coverage",
    processingConcurrency: Math.min(os.availableParallelism(), 4),
    exclude: [
      "**/*.d.ts",
      "**/*.{config,setup}.*",
      "**/schema.generated.ts",
      "tests/**",
      "scripts/**",
      "lib/observability/**",
      "lib/features/nexus/**/data/**",
      "lib/features/marketplace/**",
      "lib/features/lynx/actions/nl-sql-demo.actions.ts",
      "lib/features/lynx/components/nl-sql-demo-client.tsx",
      "lib/features/lynx/components/nl-sql-demo-dynamic-chart.tsx",
      "lib/features/lynx/components/lynx-page.tsx",
      "lib/features/lynx/components/truth-search-client.tsx",
      "lib/features/lynx/data/nl-sql-demo-prompt.server.ts",
      "lib/features/org-admin/**/data/**",
      "lib/portal/*.server.ts",
      "lib/features/org-admin/data/import-job-run.workflow.ts",
      "lib/features/execution/data/import-job-run-entry.ts",
      "lib/features/execution/index.ts",
      "lib/features/hrm/**/actions/**",
      "lib/features/hrm/**/data/**",
      "lib/features/hrm/**/components/**",
      "lib/features/orbit/**/data/**",
      "lib/features/orbit/views/**",
      "lib/features/orbit/components/**",
      "lib/features/orbit/automation/**",
      "lib/features/governed-surface/**",
    ],
    thresholds: {
      // Ratcheted down one step after HRM subtree + Orbit Phase 1 expanded instrumented surface (ADR-0008).
      statements: 45,
      branches: 35,
      lines: 46,
      functions: 38,
      "lib/auth/**/*.shared.ts": {
        statements: 88,
        branches: 83,
        lines: 88,
        functions: 91,
      },
      "lib/auth/callback-path.ts": {
        statements: 95,
        branches: 95,
        lines: 95,
        functions: 95,
      },
    },
  }
}
