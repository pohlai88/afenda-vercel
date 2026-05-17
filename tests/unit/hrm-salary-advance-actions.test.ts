import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

describe("salary advance Server Actions RBAC", () => {
  it("uses ERP salary_advance permissions instead of Better Auth org admin", () => {
    const source = readFileSync(
      new URL(
        "../../lib/features/hrm/payroll-compensation/payroll-processing/actions/salary-advance.actions.ts",
        import.meta.url
      ),
      "utf8"
    )

    expect(source).toContain("requireHrmPermission({")
    expect(source).toContain('object: "salary_advance"')
    expect(source).toContain('function: "create"')
    expect(source).toContain('function: "update"')
    expect(source).not.toContain("canActInOrganization")
  })
})
