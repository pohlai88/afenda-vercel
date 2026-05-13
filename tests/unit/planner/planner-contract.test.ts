import { describe, expect, it } from "vitest"

import enMessages from "../../../messages/en.json"

import {
  ORBIT_PRIMARY_SURFACES,
  PLANNER_ACTIVE_ITEM_LIFECYCLES,
  PLANNER_SIGNAL_CLASSES,
  accountOrbitPath,
  organizationOrbitPath,
} from "#features/planner/constants"
import { DASHBOARD_NAV_MODULES } from "#lib/dashboard-module-paths"
import {
  ORBIT_DASHBOARD_SURFACE_SEGMENT_SET,
  isOrbitDashboardSurfaceSegment,
} from "#lib/planner-dashboard.shared"

describe("planner contract", () => {
  it("registers orbit in dashboard nav and messages", () => {
    expect(DASHBOARD_NAV_MODULES.includes("orbit")).toBe(true)
    expect(
      (enMessages as { Dashboard: { nav: Record<string, string> } }).Dashboard
        .nav.orbit
    ).toBe("Orbit")
  })

  it("builds stable orbit path helpers", () => {
    expect(organizationOrbitPath("acme")).toBe("/o/acme/dashboard/orbit")
    expect(organizationOrbitPath("acme", "signals")).toBe(
      "/o/acme/dashboard/orbit/signals"
    )
    expect(accountOrbitPath()).toBe("/account/orbit")
    expect(accountOrbitPath("triage")).toBe("/account/orbit/triage")
    expect(accountOrbitPath("today")).toBe("/account/orbit/today")
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
    expect(isOrbitDashboardSurfaceSegment("queue")).toBe(false)
    expect(isOrbitDashboardSurfaceSegment("triage")).toBe(true)
    expect(isOrbitDashboardSurfaceSegment("signals")).toBe(true)
    expect(ORBIT_DASHBOARD_SURFACE_SEGMENT_SET.has("links")).toBe(true)
  })

  it("exposes ERP-grade planner doctrines", () => {
    expect(PLANNER_SIGNAL_CLASSES).toContain("manual_capture")
    expect(PLANNER_SIGNAL_CLASSES).toContain("deadline")
    expect(PLANNER_ACTIVE_ITEM_LIFECYCLES).toContain("ready_for_review")
    expect(PLANNER_ACTIVE_ITEM_LIFECYCLES).not.toContain("resolved")
  })
})
