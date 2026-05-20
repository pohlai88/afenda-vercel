import { describe, expect, it } from "vitest"

import {
  assignEmployeeSkillFormSchema,
  createSkillFormSchema,
} from "../../lib/features/hrm/talent-management/competency-skills-framework/schemas/skill.schema"

describe("HRM skill schemas", () => {
  it("accepts kebab-case skill codes", () => {
    const parsed = createSkillFormSchema.parse({
      orgSlug: "acme",
      code: "react-typescript",
      label: "React + TypeScript",
    })
    expect(parsed.code).toBe("react-typescript")
  })

  it("rejects invalid proficiency", () => {
    expect(
      assignEmployeeSkillFormSchema.safeParse({
        orgSlug: "acme",
        employeeId: "550e8400-e29b-41d4-a716-446655440000",
        skillId: "550e8400-e29b-41d4-a716-446655440001",
        proficiency: 6,
        validityFrom: "2026-01-01",
      }).success
    ).toBe(false)
  })
})
