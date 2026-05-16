import { describe, expect, it } from "vitest"

import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../../lib/features/hrm/data/employee-portal-access.shared"
import { submitEmployeePortalEnrollBenefit } from "../../lib/features/hrm/actions/employee-portal-benefit.actions"

describe("employee portal benefit actions", () => {
  it("rejects missing portal slug", async () => {
    const fd = new FormData()
    const result = await submitEmployeePortalEnrollBenefit(undefined, fd)
    expect(result).toEqual({
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    })
  })
})
