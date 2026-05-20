import { describe, expect, it } from "vitest"

import {
  VITEST_BLOB_REPORTS_DIR,
  VITEST_BLOB_REPORTS_LINK,
} from "../../scripts/lib/vitest-blob-reports.shared.mjs"

describe("vitest blob reports paths", () => {
  it("keeps canonical dir under .artifacts", () => {
    expect(VITEST_BLOB_REPORTS_DIR).toBe(".artifacts/vitest-reports")
  })

  it("documents Vitest hardcoded link name", () => {
    expect(VITEST_BLOB_REPORTS_LINK).toBe(".vitest-reports")
  })
})
