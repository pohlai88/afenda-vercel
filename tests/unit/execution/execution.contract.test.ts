import { describe, expect, it } from "vitest"

import {
  EXECUTION_AUDIT_ACTIONS,
  EXECUTION_MODULE_ID,
} from "#features/execution"

describe("execution.contract", () => {
  it("exports stable module id", () => {
    expect(EXECUTION_MODULE_ID).toBe("execution")
  })

  it("uses erp.execution namespace for audit keys", () => {
    for (const action of Object.values(EXECUTION_AUDIT_ACTIONS)) {
      expect(action.startsWith("erp.execution.")).toBe(true)
    }
  })
})
