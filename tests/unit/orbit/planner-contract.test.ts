import { describe, expect, it } from "vitest"

import enMessages from "../../../messages/en.json"

import {
  ORBIT_PRIMARY_SURFACES,
  PLANNER_ACTIVE_ITEM_LIFECYCLES,
  PLANNER_SIGNAL_CLASSES,
  organizationOrbitPath,
} from "#features/orbit/constants"
import { APPS_NAV_MODULES } from "#lib/org-apps-module-paths"
import {
  ORBIT_SURFACE_SEGMENT_SET,
  isOrbitSurfaceSegment,
} from "#features/orbit/planner-orbit-path.shared"

describe("planner contract", () => {
  it("registers orbit in apps nav and messages", () => {
    expect(APPS_NAV_MODULES.includes("orbit")).toBe(true)
    expect(
      (enMessages as { Dashboard: { nav: Record<string, string> } }).Dashboard
        .nav.orbit
    ).toBe("Orbit")
  })

  it("builds stable orbit path helpers", () => {
    expect(organizationOrbitPath("acme")).toBe("/o/acme/apps/orbit")
    expect(organizationOrbitPath("acme", "signals")).toBe(
      "/o/acme/apps/orbit/signals"
    )
  })

  it("keeps queue as a base route and other surfaces as explicit tails", () => {
    expect(ORBIT_PRIMARY_SURFACES).toEqual([
      "queue",
      "triage",
      "today",
      "timeline",
      "signals",
      "sessions",
      "links",
    ])
    expect(isOrbitSurfaceSegment("queue")).toBe(false)
    expect(isOrbitSurfaceSegment("triage")).toBe(true)
    expect(isOrbitSurfaceSegment("signals")).toBe(true)
    expect(ORBIT_SURFACE_SEGMENT_SET.has("links")).toBe(true)
  })

  it("exposes ERP-grade planner doctrines", () => {
    expect(PLANNER_SIGNAL_CLASSES).toContain("manual_capture")
    expect(PLANNER_SIGNAL_CLASSES).toContain("deadline")
    expect(PLANNER_ACTIVE_ITEM_LIFECYCLES).toContain("ready_for_review")
    expect(PLANNER_ACTIVE_ITEM_LIFECYCLES).not.toContain("resolved")
  })
})
