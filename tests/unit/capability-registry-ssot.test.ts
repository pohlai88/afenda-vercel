import { describe, expect, it } from "vitest"

import { HRM_CAPABILITIES } from "#features/hrm"
import {
  ORG_ADMIN_CAPABILITIES,
  ORG_ADMIN_PATH_SEGMENTS,
} from "#features/org-admin"
import {
  PLATFORM_ADMIN_ALLOWED_SEGMENTS,
  PLATFORM_ADMIN_CAPABILITIES,
} from "#features/platform-admin"
import { HRM_DASHBOARD_CAPABILITY_SEGMENTS } from "#features/hrm/hrm-dashboard-path.shared"

describe("capability registry SSOT", () => {
  it("ORG_ADMIN_PATH_SEGMENTS matches ORG_ADMIN_CAPABILITIES segments", () => {
    const expected = new Set(
      ORG_ADMIN_CAPABILITIES.flatMap((c) => [...c.segments])
    )
    expect(ORG_ADMIN_PATH_SEGMENTS.size).toBe(expected.size)
    for (const s of expected) {
      expect(ORG_ADMIN_PATH_SEGMENTS.has(s)).toBe(true)
    }
  })

  it("PLATFORM_ADMIN_ALLOWED_SEGMENTS matches PLATFORM_ADMIN_CAPABILITIES", () => {
    const expected = new Set(
      PLATFORM_ADMIN_CAPABILITIES.flatMap((c) => [...c.segments])
    )
    expect(new Set(PLATFORM_ADMIN_ALLOWED_SEGMENTS)).toEqual(expected)
  })

  it("HRM_DASHBOARD_CAPABILITY_SEGMENTS matches HRM_CAPABILITIES segments", () => {
    const fromRegistry = new Set(
      HRM_CAPABILITIES.flatMap((c) => [...c.segments])
    )
    expect(new Set(HRM_DASHBOARD_CAPABILITY_SEGMENTS)).toEqual(fromRegistry)
  })
})
