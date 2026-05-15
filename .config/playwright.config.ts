import { defineConfig, devices } from "@playwright/test"
import net from "node:net"
import { fileURLToPath } from "node:url"

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
const defaultBaseURL = "http://127.0.0.1:3001"
const configuredBaseURL = (
  process.env.PLAYWRIGHT_BASE_URL?.trim() ||
  process.env.BASE_URL?.trim() ||
  ""
).trim()
const repoRoot = fileURLToPath(new URL("..", import.meta.url))

const isCi = ["1", "true", "yes"].includes(
  String(process.env.CI ?? "").toLowerCase()
)

async function hasListeningServer(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()

    const finish = (result: boolean) => {
      socket.destroy()
      resolve(result)
    }

    socket.setTimeout(750)
    socket.once("connect", () => finish(true))
    socket.once("timeout", () => finish(false))
    socket.once("error", () => finish(false))
    socket.connect(port, "127.0.0.1")
  })
}

const detectedLocalBaseURL =
  configuredBaseURL.length === 0 && !isCi && (await hasListeningServer(3000))
    ? "http://127.0.0.1:3000"
    : ""

const hasExternalServer =
  configuredBaseURL.length > 0 || detectedLocalBaseURL.length > 0
const baseURL = configuredBaseURL || detectedLocalBaseURL || defaultBaseURL
const e2ePort = new URL(baseURL).port || "3001"

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
        ["junit", { outputFile: "../.artifacts/playwright-junit.xml" }],
      ]
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
          command: `pnpm exec next dev --turbopack -p ${e2ePort}`,
          cwd: repoRoot,
          url: baseURL,
          reuseExistingServer: !isCi,
          timeout: 120_000,
          env: {
            ...process.env,
            PORT: e2ePort,
            BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? baseURL,
          },
          stdout: "pipe",
          stderr: "pipe",
        },
      }),
})
