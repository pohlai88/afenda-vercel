import { describe, expect, it } from "vitest"

import { describeOrgNotificationBadge } from "#features/org-notifications"

describe("org notification display helper", () => {
  it("classifies blocked Orbit notices into escalation badges", () => {
    expect(
      describeOrgNotificationBadge({
        linkedEntityType: "planner_item",
        title: "Orbit escalation breach: Payroll close blocked",
      })
    ).toEqual({
      label: "Breach",
      tone: "critical",
    })

    expect(
      describeOrgNotificationBadge({
        linkedEntityType: "planner_item",
        title: "Orbit blocker review overdue: Verify supplier variance",
      })
    ).toEqual({
      label: "Overdue",
      tone: "warning",
    })
  })

  it("ignores non-Orbit records", () => {
    expect(
      describeOrgNotificationBadge({
        linkedEntityType: "knowledge_run",
        title: "Knowledge sync failed",
      })
    ).toBeNull()
  })

  it("classifies planner workflow failure notices", () => {
    expect(
      describeOrgNotificationBadge({
        linkedEntityType: "planner_item",
        title: "Orbit reminder delivery failed: Payroll review",
      })
    ).toEqual({
      label: "Delivery",
      tone: "warning",
    })

    expect(
      describeOrgNotificationBadge({
        linkedEntityType: "planner_item",
        title: "Orbit recurrence processing failed: Payroll review",
      })
    ).toEqual({
      label: "Automation",
      tone: "warning",
    })
  })
})
