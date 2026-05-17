import { describe, expect, it } from "vitest"

import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/data/employee-portal-access.shared.ts"
import { submitEmployeePortalRequestAdvance } from "../../lib/features/hrm/employee-management/employee-selfservice-portal/actions/employee-portal-advance.actions"

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
