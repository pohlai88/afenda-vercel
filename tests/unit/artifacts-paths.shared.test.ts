import { describe, expect, it } from "vitest"

import {
  ARTIFACTS_LOGS_DIR,
  ARTIFACTS_REPORTS_DIR,
  PLAYWRIGHT_JUNIT_LEGACY_PATH,
  PLAYWRIGHT_JUNIT_PATH,
  PLAYWRIGHT_TEST_RESULTS_DIR,
} from "../../scripts/lib/artifacts-paths.shared.mjs"

describe("artifacts paths", () => {
  it("routes ad-hoc logs and reports into subfolders", () => {
    expect(ARTIFACTS_LOGS_DIR).toBe(".artifacts/logs")
    expect(ARTIFACTS_REPORTS_DIR).toBe(".artifacts/reports")
  })

  it("keeps Playwright junit under playwright/", () => {
    expect(PLAYWRIGHT_JUNIT_PATH).toBe(".artifacts/playwright/junit.xml")
    expect(PLAYWRIGHT_TEST_RESULTS_DIR).toBe(
      ".artifacts/playwright/test-results"
    )
    expect(PLAYWRIGHT_JUNIT_LEGACY_PATH).toBe(".artifacts/playwright-junit.xml")
  })
})
