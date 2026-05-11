import { describe, expect, it } from "vitest"

import type { NexusRightUtilityAvailabilityContext } from "#features/nexus"
import {
  canEnableRightUtilityWidget,
  getEligibleCustomizeRightWidgetIds,
  getVisibleRightUtilityWidgetIds,
  migrateUtilityWidgetPrefs,
} from "#components/workbench/utility-bar/workbench-utility-widget-registry"

const fullAvailability: NexusRightUtilityAvailabilityContext = {
  isAdmin: true,
  isMobile: true,
  multiLocale: true,
  multiOrg: true,
}

describe("nexus utility widget registry", () => {
  it("migrates legacy integrations prefs to marketplace", () => {
    expect(
      migrateUtilityWidgetPrefs({
        "right.integrations": false,
      })
    ).toEqual({
      "right.marketplace": false,
    })
  })

  it("caps visible utilities to nine before the avatar", () => {
    expect(
      getVisibleRightUtilityWidgetIds({
        prefs: {},
        availability: fullAvailability,
      })
    ).toEqual([
      "right.marketplace",
      "right.console",
      "right.quickCreate",
      "right.notifications",
      "right.insight",
      "right.connectivity",
      "right.feedback",
      "right.shortcuts",
      "right.help",
    ])
  })

  it("filters admin, multi-org, multi-locale, and mobile utilities from customize when unavailable", () => {
    expect(
      getEligibleCustomizeRightWidgetIds({
        isAdmin: false,
        isMobile: false,
        multiLocale: false,
        multiOrg: false,
      })
    ).toEqual([
      "right.quickCreate",
      "right.notifications",
      "right.insight",
      "right.connectivity",
      "right.feedback",
      "right.shortcuts",
      "right.help",
      "right.theme",
      "right.density",
      "right.storage",
      "right.diagnosis",
      "right.upload",
      "right.screenshot",
      "right.messenger",
    ])
  })

  it("blocks enabling a hidden tenth utility once the rail is full", () => {
    expect(
      canEnableRightUtilityWidget({
        id: "right.storage",
        prefs: {},
        availability: {
          isAdmin: false,
          isMobile: false,
          multiLocale: false,
          multiOrg: false,
        },
      })
    ).toBe(false)
  })

  it("keeps messenger, screenshot, and upload hidden by default after promotion into the installed registry", () => {
    const visible = getVisibleRightUtilityWidgetIds({
      prefs: {},
      availability: {
        isAdmin: false,
        isMobile: false,
        multiLocale: false,
        multiOrg: false,
      },
    })

    expect(visible).not.toContain("right.messenger")
    expect(visible).not.toContain("right.upload")
    expect(visible).not.toContain("right.screenshot")
  })
})
