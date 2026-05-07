import { defineConfig, devices } from "@playwright/test"

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
 * Legacy-style defaults (see afenda-next): E2E targets **3001** with `next start` so
 * **`pnpm dev` on 3000** does not need to stop. Override with `PLAYWRIGHT_BASE_URL` or
 * `BASE_URL` — when set, no `webServer` is started (you supply the server).
 */
const defaultBaseURL = "http://127.0.0.1:3001"
const configuredBaseURL = (
  process.env.PLAYWRIGHT_BASE_URL?.trim() ||
  process.env.BASE_URL?.trim() ||
  ""
).trim()
const hasExternalServer = configuredBaseURL.length > 0
const baseURL = hasExternalServer ? configuredBaseURL : defaultBaseURL
const e2ePort = new URL(baseURL).port || "3001"

const isCi = ["1", "true", "yes"].includes(
  String(process.env.CI ?? "").toLowerCase()
)

export default defineConfig({
  /** Traces, screenshots, videos — keep repo root clean (see AGENTS.md §2). */
  outputDir: ".artifacts/playwright/test-results",
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  expect: { timeout: 10_000 },
  // JUnit for CI artifacts; traces/screenshots/videos use `outputDir` above. If you add the HTML reporter, set
  // `outputFolder` under `.artifacts/playwright/` so nothing lands at the repo root.
  reporter: isCi
    ? [["line"], ["junit", { outputFile: ".artifacts/playwright-junit.xml" }]]
    : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  ...(hasExternalServer
    ? {}
    : {
        webServer: {
          command: `pnpm exec next start -p ${e2ePort}`,
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: 120_000,
          env: {
            ...process.env,
            PORT: e2ePort,
            NODE_ENV: "production",
            BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? baseURL,
          },
          stdout: "pipe",
          stderr: "pipe",
        },
      }),
})
