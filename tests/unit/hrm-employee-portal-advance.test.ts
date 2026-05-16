import { describe, expect, it } from "vitest"

import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../../lib/features/hrm/data/employee-portal-access.shared"
import { submitEmployeePortalRequestAdvance } from "../../lib/features/hrm/actions/employee-portal-advance.actions"

describe("employee portal advance actions", () => {
  it("rejects missing portal slug", async () => {
    const fd = new FormData()
    const result = await submitEmployeePortalRequestAdvance(undefined, fd)
    expect(result).toEqual({
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    })
  })
})
