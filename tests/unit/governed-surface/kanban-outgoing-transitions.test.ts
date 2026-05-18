import { describe, expect, it } from "vitest"

import {
  buildKanbanOutgoingTransitionHints,
  kanbanTransitionId,
} from "#features/governed-surface"

describe("buildKanbanOutgoingTransitionHints", () => {
  it("resolves multiple outgoing edges with mixed availability", () => {
    const hints = buildKanbanOutgoingTransitionHints("screening", [
      {
        toColumnId: "interview",
        label: "Move to interview",
        allowed: true,
      },
      {
        toColumnId: "offer",
        label: "Skip to offer",
        allowed: false,
        disabledReason: "Not permitted",
      },
    ])

    expect(hints).toHaveLength(2)
    expect(hints[0]?.transitionId).toBe(
      kanbanTransitionId("screening", "interview")
    )
    expect(hints[0]?.state).toBe("ready")
    expect(hints[1]?.state).toBe("disabled")
    expect(hints[1]?.disabledReason).toBe("Not permitted")
  })
})
