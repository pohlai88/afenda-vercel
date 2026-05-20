import { describe, expect, it } from "vitest"

import { PLANNER_AUDIT_ACTIONS, buildPlannerAuditAction } from "#features/orbit"

describe("planner.contract", () => {
  it("registry literals match buildPlannerAuditAction for each emitted pair", () => {
    const pairs: Array<
      [
        keyof typeof PLANNER_AUDIT_ACTIONS,
        Parameters<typeof buildPlannerAuditAction>,
      ]
    > = [
      ["assignmentAssign", ["assignment", "assign"]],
      ["attachmentAttach", ["attachment", "attach"]],
      ["commentComment", ["comment", "comment"]],
      ["itemCreate", ["item", "create"]],
      ["itemSchedule", ["item", "schedule"]],
      ["itemTransition", ["item", "transition"]],
      ["linkCreate", ["link", "create"]],
      ["recurrenceUpsert", ["recurrence", "upsert"]],
      ["relationCreate", ["relation", "create"]],
      ["reminderUpsert", ["reminder", "upsert"]],
      ["sessionStart", ["session", "start"]],
      ["sessionStop", ["session", "stop"]],
      ["signalCreate", ["signal", "create"]],
      ["signalPromote", ["signal", "promote"]],
      ["signalTransition", ["signal", "transition"]],
      ["viewDelete", ["view", "delete"]],
      ["viewUpsert", ["view", "upsert"]],
    ]

    for (const [key, args] of pairs) {
      expect(PLANNER_AUDIT_ACTIONS[key]).toBe(buildPlannerAuditAction(...args))
    }
  })
})
