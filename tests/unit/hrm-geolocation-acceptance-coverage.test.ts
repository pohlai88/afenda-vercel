import { existsSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import {
  HRM_GEOLOCATION_ACCEPTANCE_COVERAGE,
  listGeolocationAcceptanceCriteria,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/geolocation-acceptance-coverage.shared.ts"
import {
  HRM_GEOLOCATION_SPEC_MAP,
  listHrmGeolocationSpecCodes,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/geolocation-spec-map.shared.ts"

const MODULE_ROOT = join(
  process.cwd(),
  "lib/features/hrm/time-attendance/geolocation-remote-checkin"
)

describe("HRM Geolocation acceptance coverage", () => {
  it("covers every HRM-GEO spec code from ARCHITECTURE.md", () => {
    const specCodes = listHrmGeolocationSpecCodes()
    expect(specCodes).toHaveLength(32)
    for (const code of specCodes) {
      expect(HRM_GEOLOCATION_ACCEPTANCE_COVERAGE[code]).toBeDefined()
      expect(HRM_GEOLOCATION_ACCEPTANCE_COVERAGE[code].status).toMatch(
        /^(shipped|partial|deferred)$/
      )
    }
    expect(Object.keys(HRM_GEOLOCATION_ACCEPTANCE_COVERAGE)).toHaveLength(32)
  })

  it("maps acceptance criteria 1–30 without gaps", () => {
    const criteria = listGeolocationAcceptanceCriteria()
    expect(criteria[0]).toBe(1)
    expect(criteria[criteria.length - 1]).toBe(30)
    expect(criteria).toHaveLength(30)
  })

  it("keeps spec-map area keys aligned with coverage keys", () => {
    expect(Object.keys(HRM_GEOLOCATION_ACCEPTANCE_COVERAGE).sort()).toEqual(
      Object.keys(HRM_GEOLOCATION_SPEC_MAP).sort()
    )
  })

  it("has on-disk evidence for shipped and partial requirements", () => {
    for (const [code, entry] of Object.entries(
      HRM_GEOLOCATION_ACCEPTANCE_COVERAGE
    )) {
      if (entry.status === "deferred") {
        expect(entry.evidence, code).toHaveLength(0)
        continue
      }
      expect(entry.evidence.length, code).toBeGreaterThan(0)
      for (const relativePath of entry.evidence) {
        expect(
          existsSync(join(MODULE_ROOT, relativePath)),
          `${code} → ${relativePath}`
        ).toBe(true)
      }
    }
  })
})
