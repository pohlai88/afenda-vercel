import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

describe("skill Server Actions RBAC", () => {
  it("gates mutations with requireHrmPermission on skill object", () => {
    const source = readFileSync(
      new URL(
        "../../lib/features/hrm/actions/skill.actions.ts",
        import.meta.url
      ),
      "utf8"
    )

    expect(source).toContain("requireHrmPermission({")
    expect(source).toContain('object: "skill"')
    expect(source).toContain("erp.hrm.skill.create")
    expect(source).not.toContain("canActInOrganization")
  })
})
