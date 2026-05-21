/**
 * Worker-scoped authentication fixture for E2E tests.
 *
 * Authenticates once per Playwright worker using the seeded org-admin credentials and
 * caches the session `storageState` at `.artifacts/playwright/.auth/worker-{id}.json`.
 * Subsequent tests in the same worker reuse the saved state, cutting per-test sign-in
 * overhead and allowing parallel workers to operate without DB write races.
 *
 * Source: https://playwright.dev/docs/auth#moderate-one-account-per-parallel-worker
 *
 * Usage: import `test` and `expect` from this file instead of `@playwright/test`.
 *
 * ```ts
 * import { expect, test } from "./fixtures/auth"
 * ```
 *
 * Tests that must remain unauthenticated continue to import from `@playwright/test`
 * directly and should NOT use this fixture.
 */
import fs from "node:fs"
import path from "node:path"

import { test as baseTest } from "@playwright/test"

import { BOOTSTRAP_FIXTURE } from "../../fixtures/bootstrap-mocks"
import { resolveE2EBaseURL } from "../utils/e2e-base-url"
import { signInAsOrgAdmin } from "../utils/org-admin-auth"

export { expect } from "@playwright/test"

/** Must stay aligned with `DEV_PASSWORD` in `scripts/seed-dev-users.mjs`. */
const DEV_OWNER_PASSWORD = "123qweasdzxc!@#"

export const test = baseTest.extend<
  Record<never, never>,
  { workerStorageState: string }
>({
  /**
   * Override `storageState` so every page in this worker starts pre-authenticated
   * with the session file produced by `workerStorageState`.
   */
  storageState: ({ workerStorageState }, applyStorageState) =>
    applyStorageState(workerStorageState),

  workerStorageState: [
    async ({ browser }, provideWorkerStorageState) => {
      const id = test.info().parallelIndex

      // Keep auth state files under .artifacts (gitignored) — not in the source tree.
      const authDir = path.resolve(
        import.meta.dirname,
        "../../../.artifacts/playwright/.auth"
      )
      const fileName = path.join(authDir, `worker-${id}.json`)

      // Reuse an existing state file for the lifetime of this worker process.
      if (fs.existsSync(fileName)) {
        await provideWorkerStorageState(fileName)
        return
      }

      fs.mkdirSync(authDir, { recursive: true })

      // Fall back to dev seed credentials so local runs work without env vars.
      const email =
        process.env.E2E_ORG_ADMIN_EMAIL?.trim() ||
        BOOTSTRAP_FIXTURE.members[0].email
      const password =
        process.env.E2E_ORG_ADMIN_PASSWORD?.trim() || DEV_OWNER_PASSWORD

      if (!email || !password) {
        // No credentials at all — write an empty state; each test's skip guard handles the rest.
        fs.writeFileSync(fileName, JSON.stringify({ cookies: [], origins: [] }))
        await provideWorkerStorageState(fileName)
        return
      }

      // Authenticate in a clean context to avoid contaminating other workers.
      const baseURL = await resolveE2EBaseURL()

      const context = await browser.newContext({
        storageState: undefined,
        baseURL,
      })
      const page = await context.newPage()
      try {
        await signInAsOrgAdmin(page, email, password)
        await context.storageState({ path: fileName })
      } finally {
        await page.close()
        await context.close()
      }

      await provideWorkerStorageState(fileName)
    },
    { scope: "worker", timeout: 300_000 },
  ],
})
