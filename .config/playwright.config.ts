import { defineConfig, devices } from "@playwright/test"
import { fileURLToPath } from "node:url"

import { resolveE2EBaseURL } from "../tests/e2e/utils/e2e-base-url.ts"

/**
 * Node honors `FORCE_COLOR` over `NO_COLOR` (see Node `cli.md` / `util.styleText`).
 * IDEs often set `FORCE_COLOR`; tools may also set `NO_COLOR`, which triggers:
 * `(node) Warning: The 'NO_COLOR' env is ignored due to the 'FORCE_COLOR' being set.`
 * Drop the redundant `NO_COLOR` so Playwright workers inherit a consistent env.
 */
if (
  process.env.FORCE_COLOR !== undefined &&
  process.env.NO_COLOR !== undefined
) {
  delete process.env.NO_COLOR
}

/**
 * E2E targets **3001** so `pnpm dev` on **3000** does not need to stop.
 *
 * Next 16 / Turbopack in this repo currently emits a production artifact shape
 * that `next start` does not boot from reliably during Playwright startup, even
 * after a successful `next build`. To keep browser coverage executable, the
 * harness boots a dedicated `next dev --turbopack` server on 3001 instead.
 *
 * Override with `PLAYWRIGHT_BASE_URL` or `BASE_URL` to supply your own server;
 * when set, no local `webServer` is started.
 */
const repoRoot = fileURLToPath(new URL("..", import.meta.url))

const isCi = ["1", "true", "yes"].includes(
  String(process.env.CI ?? "").toLowerCase()
)

const configuredBaseURL = (
  process.env.PLAYWRIGHT_BASE_URL?.trim() ||
  process.env.BASE_URL?.trim() ||
  ""
).trim()

const baseURL = await resolveE2EBaseURL()
const usesExternalDevServer =
  configuredBaseURL.length > 0 ||
  baseURL === "http://127.0.0.1:3000"
const e2ePort = new URL(baseURL).port || "3001"

function buildPlaywrightWebServerEnv(): NodeJS.ProcessEnv {
  const trusted = new Set(
    (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0)
  )
  trusted.add(baseURL)
  trusted.add("http://localhost:3000")
  trusted.add("http://127.0.0.1:3000")

  return {
    ...process.env,
    PORT: e2ePort,
    BETTER_AUTH_URL: baseURL,
    NEXT_PUBLIC_BETTER_AUTH_URL: `${baseURL}/api/auth`,
    BETTER_AUTH_TRUSTED_ORIGINS: [...trusted].join(","),
  }
}

export default defineConfig({
  /** Traces, screenshots, videos — keep repo root clean (see AGENTS.md §2). */
  outputDir: "../.artifacts/playwright/test-results",
  testDir: "../tests/e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 2 : undefined,
  expect: { timeout: 10_000 },
  // JUnit for CI artifacts; traces/screenshots/videos use `outputDir` above. If you add the HTML reporter, set
  // `outputFolder` under `.artifacts/playwright/` so nothing lands at the repo root.
  reporter: isCi
    ? [
        ["line"],
        ["junit", { outputFile: "../.artifacts/playwright/junit.xml" }],
      ]
    : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(usesExternalDevServer
    ? {}
    : {
        webServer: {
          command: `pnpm exec next dev --turbopack -p ${e2ePort}`,
          cwd: repoRoot,
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: 300_000,
          env: buildPlaywrightWebServerEnv(),
          stdout: "pipe",
          stderr: "pipe",
        },
      }),
})
