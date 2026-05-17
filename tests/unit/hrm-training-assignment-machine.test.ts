import { describe, expect, it } from "vitest"

import { canTransitionTrainingAssignment } from "../../lib/features/hrm/talent-management/training-development/schemas/training.schema"
import type { HrmTrainingAssignmentState } from "../../lib/features/hrm/talent-management/training-development/schemas/training.schema"

const transitions: Array<{
  from: HrmTrainingAssignmentState
  to: HrmTrainingAssignmentState
  allowed: boolean
}> = [
  { from: "assigned", to: "completed", allowed: true },
  { from: "assigned", to: "waived", allowed: true },
  { from: "assigned", to: "cancelled", allowed: true },
  { from: "assigned", to: "overdue", allowed: true },
  { from: "overdue", to: "completed", allowed: true },
  { from: "completed", to: "assigned", allowed: false },
  { from: "waived", to: "completed", allowed: false },
  { from: "cancelled", to: "assigned", allowed: false },
]

describe("training assignment state machine", () => {
  it.each(transitions)(
    "$from → $to is allowed=$allowed",
    ({ from, to, allowed }) => {
      expect(canTransitionTrainingAssignment(from, to)).toBe(allowed)
    }
  )
})
