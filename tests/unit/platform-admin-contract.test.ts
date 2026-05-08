import { describe, expect, it } from "vitest"

import enMessages from "../../messages/en.json"

// Deep-import the registry to avoid loading the barrel (which transitively
// pulls in `next-intl` + server-only data). Test files are exempt from the
// `#features/*/*` deep-import lint.
import {
  PLATFORM_ADMIN_ALLOWED_SEGMENTS,
  PLATFORM_ADMIN_CAPABILITIES,
  PLATFORM_ADMIN_CAPABILITY_IDS,
  PLATFORM_ADMIN_NAV_ITEMS,
  PLATFORM_ADMIN_USERS_MAX_PAGE_SIZE,
  PLATFORM_ADMIN_USERS_PAGE_SIZE,
  PLATFORM_ADMIN_USERS_SEARCH_MAX_LENGTH,
  getPlatformAdminCapabilityById,
  isAllowedPlatformAdminSegment,
  platformAdminPath,
} from "#features/platform-admin/constants"
import { PLATFORM_ADMIN_NAV_NAMESPACE } from "#features/platform-admin/types"

const NAV_MESSAGES = (enMessages as Record<string, unknown>).PlatformAdmin as {
  nav: Record<string, string>
  card: Record<string, unknown>
}

describe("PLATFORM_ADMIN_CAPABILITIES registry", () => {
  it("has at least one capability with at least one segment", () => {
    expect(PLATFORM_ADMIN_CAPABILITIES.length).toBeGreaterThan(0)
    for (const capability of PLATFORM_ADMIN_CAPABILITIES) {
      expect(capability.segments.length).toBeGreaterThan(0)
    }
  })

  it("uses unique capability ids and unique segments", () => {
    const ids = PLATFORM_ADMIN_CAPABILITIES.map((capability) => capability.id)
    expect(new Set(ids).size).toBe(ids.length)
    const segments = PLATFORM_ADMIN_CAPABILITIES.flatMap((capability) => [
      ...capability.segments,
    ])
    expect(new Set(segments).size).toBe(segments.length)
  })

  it("audit prefix uses the canonical iam.* taxonomy and ends with a dot", () => {
    for (const capability of PLATFORM_ADMIN_CAPABILITIES) {
      expect(capability.auditPrefix.startsWith("iam.")).toBe(true)
      expect(capability.auditPrefix.endsWith(".")).toBe(true)
    }
  })

  it("nav.primarySegment is always one of the capability's segments", () => {
    for (const capability of PLATFORM_ADMIN_CAPABILITIES) {
      if (!capability.nav) continue
      expect(capability.segments).toContain(capability.nav.primarySegment)
    }
  })

  it("getPlatformAdminCapabilityById round-trips every registered id", () => {
    for (const id of PLATFORM_ADMIN_CAPABILITY_IDS) {
      const capability = getPlatformAdminCapabilityById(id)
      expect(capability).toBeDefined()
      expect(capability?.id).toBe(id)
    }
  })

  it("returns undefined for an unknown id", () => {
    expect(
      // @ts-expect-error — simulating runtime input outside the union
      getPlatformAdminCapabilityById("nonsense")
    ).toBeUndefined()
  })
})

describe("PLATFORM_ADMIN_ALLOWED_SEGMENTS", () => {
  it("contains every registered capability segment exactly once and is sorted", () => {
    const expected = Array.from(
      new Set(
        PLATFORM_ADMIN_CAPABILITIES.flatMap((capability) => [
          ...capability.segments,
        ])
      )
    ).sort()
    expect([...PLATFORM_ADMIN_ALLOWED_SEGMENTS]).toEqual(expected)
  })

  it("isAllowedPlatformAdminSegment narrows the input type for known segments", () => {
    for (const segment of PLATFORM_ADMIN_ALLOWED_SEGMENTS) {
      expect(isAllowedPlatformAdminSegment(segment)).toBe(true)
    }
  })

  it("isAllowedPlatformAdminSegment rejects unknown values", () => {
    expect(isAllowedPlatformAdminSegment("definitely-not-a-segment")).toBe(
      false
    )
    expect(isAllowedPlatformAdminSegment("")).toBe(false)
  })
})

describe("PLATFORM_ADMIN_NAV_ITEMS", () => {
  it("derives one nav item per capability with a nav entry, sorted by order", () => {
    const navCapabilities = PLATFORM_ADMIN_CAPABILITIES.filter(
      (capability) => capability.nav !== null
    )
    expect(PLATFORM_ADMIN_NAV_ITEMS.length).toBe(navCapabilities.length)
    const orders = PLATFORM_ADMIN_NAV_ITEMS.map((item) => item.order)
    expect([...orders].sort((a, b) => a - b)).toEqual(orders)
  })

  it("each nav item href matches platformAdminPath(primarySegment)", () => {
    for (const item of PLATFORM_ADMIN_NAV_ITEMS) {
      const capability = getPlatformAdminCapabilityById(item.capabilityId)
      expect(capability?.nav).not.toBeNull()
      const expected = platformAdminPath(capability!.nav!.primarySegment)
      expect(item.href).toBe(expected)
    }
  })

  it("every nav item resolves to a non-empty PlatformAdmin.nav.* message", () => {
    expect(PLATFORM_ADMIN_NAV_NAMESPACE).toBe("PlatformAdmin.nav")
    expect(NAV_MESSAGES.nav.aria).toBeTruthy()
    expect(NAV_MESSAGES.nav.overview).toBeTruthy()
    for (const item of PLATFORM_ADMIN_NAV_ITEMS) {
      const message = NAV_MESSAGES.nav[item.navKey]
      expect(message, `nav.${item.navKey} message`).toBeTruthy()
    }
  })

  it("every nav item has matching PlatformAdmin.card.<navKey> copy", () => {
    for (const item of PLATFORM_ADMIN_NAV_ITEMS) {
      const card = NAV_MESSAGES.card[item.navKey] as
        | Record<string, string>
        | undefined
      expect(card?.title, `card.${item.navKey}.title`).toBeTruthy()
      expect(card?.description, `card.${item.navKey}.description`).toBeTruthy()
      expect(card?.action, `card.${item.navKey}.action`).toBeTruthy()
    }
  })
})

describe("platformAdminPath", () => {
  it("returns /operator without arguments", () => {
    expect(platformAdminPath()).toBe("/operator")
  })

  it("returns /operator/{segment} for a non-empty segment", () => {
    expect(platformAdminPath("users")).toBe("/operator/users")
    expect(platformAdminPath("organizations")).toBe("/operator/organizations")
  })

  it("strips leading slashes from the segment", () => {
    expect(platformAdminPath("/users")).toBe("/operator/users")
    expect(platformAdminPath("///nested")).toBe("/operator/nested")
  })
})

describe("user directory pagination constants", () => {
  it("page size is positive and within the max", () => {
    expect(PLATFORM_ADMIN_USERS_PAGE_SIZE).toBeGreaterThan(0)
    expect(PLATFORM_ADMIN_USERS_PAGE_SIZE).toBeLessThanOrEqual(
      PLATFORM_ADMIN_USERS_MAX_PAGE_SIZE
    )
  })

  it("search is bounded to a sensible length", () => {
    expect(PLATFORM_ADMIN_USERS_SEARCH_MAX_LENGTH).toBeGreaterThanOrEqual(32)
    expect(PLATFORM_ADMIN_USERS_SEARCH_MAX_LENGTH).toBeLessThanOrEqual(512)
  })
})
