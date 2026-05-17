/**
 * Training actions — guarded paths and schema contracts.
 *
 * Tests the Zod schemas that gate every Server Action's input validation:
 * - create category form schema
 * - create course form schema (statutory, recert, delivery)
 * - create session form schema (start/end datetime range)
 * - assign training form schema
 * - complete training record form schema
 * - verify training record form schema
 *
 * The guard sequence for every action is:
 *   requireHrmOrgTenantFromForm → requireErpPermission → Zod.parse → DB mutation → after(audit)
 *
 * DB-heavy mutation paths are excluded from unit coverage (ADR-0008); here we
 * verify the schema validation contracts that block the mutation from starting.
 */
import { describe, expect, it } from "vitest"

import {
  createTrainingCategoryFormSchema,
  createTrainingCourseFormSchema,
  createTrainingSessionFormSchema,
  assignTrainingFormSchema,
  completeTrainingRecordFormSchema,
  verifyTrainingRecordFormSchema,
  normalizeTrainingCourseCode,
} from "../../lib/features/hrm/talent-management/training-development/schemas/training.schema"

const ORG_ID = "11111111-1111-4111-8111-111111111111"
const ORG_SLUG = "acme"
const COURSE_ID = "22222222-2222-4222-8222-222222222222"
const EMPLOYEE_ID = "33333333-3333-4333-8333-333333333333"
const ASSIGNMENT_ID = "44444444-4444-4444-8444-444444444444"
const RECORD_ID = "55555555-5555-4555-8555-555555555555"

// ---------------------------------------------------------------------------
// createTrainingCategoryFormSchema
// ---------------------------------------------------------------------------

describe("createTrainingCategoryFormSchema", () => {
  it("accepts valid input", () => {
    const result = createTrainingCategoryFormSchema.safeParse({
      organizationId: ORG_ID,
      orgSlug: ORG_SLUG,
      code: "SAFETY",
      name: "Workplace Safety",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing code", () => {
    const result = createTrainingCategoryFormSchema.safeParse({
      organizationId: ORG_ID,
      orgSlug: ORG_SLUG,
      name: "Safety",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid organizationId (non-UUID)", () => {
    const result = createTrainingCategoryFormSchema.safeParse({
      organizationId: "not-a-uuid",
      orgSlug: ORG_SLUG,
      code: "X",
      name: "X",
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// createTrainingCourseFormSchema
// ---------------------------------------------------------------------------

describe("createTrainingCourseFormSchema", () => {
  const base = {
    organizationId: ORG_ID,
    orgSlug: ORG_SLUG,
    code: "OSH-101",
    name: "Workplace Safety Level 1",
  }

  it("accepts minimal valid input", () => {
    expect(createTrainingCourseFormSchema.safeParse(base).success).toBe(true)
  })

  it("coerces statutory checkbox 'on' to true", () => {
    const result = createTrainingCourseFormSchema.safeParse({
      ...base,
      statutoryFlag: "on",
      statutoryAuthorityCode: "MY-DOSH",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.statutoryFlag).toBe(true)
      expect(result.data.statutoryAuthorityCode).toBe("MY-DOSH")
    }
  })

  it("defaults statutory flag to false when omitted", () => {
    const result = createTrainingCourseFormSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.statutoryFlag).toBe(false)
    }
  })

  it("coerces recertificationIntervalMonths from string to number", () => {
    const result = createTrainingCourseFormSchema.safeParse({
      ...base,
      recertificationIntervalMonths: "24",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.recertificationIntervalMonths).toBe(24)
    }
  })

  it("rejects negative recertification interval", () => {
    const result = createTrainingCourseFormSchema.safeParse({
      ...base,
      recertificationIntervalMonths: -1,
    })
    expect(result.success).toBe(false)
  })

  it("normalizes course code to uppercase (trims, uppercases, no hyphen replacement)", () => {
    expect(normalizeTrainingCourseCode("osh-101")).toBe("OSH-101")
    expect(normalizeTrainingCourseCode("  FIRE-SAFETY  ")).toBe("FIRE-SAFETY")
    expect(normalizeTrainingCourseCode("fire-safety")).toBe("FIRE-SAFETY")
  })
})

// ---------------------------------------------------------------------------
// createTrainingSessionFormSchema
// ---------------------------------------------------------------------------

describe("createTrainingSessionFormSchema", () => {
  const base = {
    organizationId: ORG_ID,
    orgSlug: ORG_SLUG,
    courseId: COURSE_ID,
    code: "OSH-101-2026-01",
    title: "Workplace Safety Q1 2026",
    scheduledStartAt: "2026-06-01T09:00",
    scheduledEndAt: "2026-06-01T17:00",
    location: "HQ Training Room A",
  }

  it("accepts valid input", () => {
    expect(createTrainingSessionFormSchema.safeParse(base).success).toBe(true)
  })

  it("rejects missing courseId", () => {
    const { courseId: _courseId, ...rest } = base
    expect(createTrainingSessionFormSchema.safeParse(rest).success).toBe(false)
  })

  it("rejects empty location", () => {
    expect(
      createTrainingSessionFormSchema.safeParse({ ...base, location: "" })
        .success
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// assignTrainingFormSchema
// ---------------------------------------------------------------------------

describe("assignTrainingFormSchema", () => {
  const base = {
    organizationId: ORG_ID,
    orgSlug: ORG_SLUG,
    courseId: COURSE_ID,
    employeeId: EMPLOYEE_ID,
  }

  it("accepts minimal valid input", () => {
    expect(assignTrainingFormSchema.safeParse(base).success).toBe(true)
  })

  it("accepts optional sessionId", () => {
    const result = assignTrainingFormSchema.safeParse({
      ...base,
      sessionId: "66666666-6666-4666-8666-666666666666",
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing employeeId", () => {
    const { employeeId: _eid, ...rest } = base
    expect(assignTrainingFormSchema.safeParse(rest).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// completeTrainingRecordFormSchema
// ---------------------------------------------------------------------------

describe("completeTrainingRecordFormSchema", () => {
  const base = {
    organizationId: ORG_ID,
    orgSlug: ORG_SLUG,
    courseId: COURSE_ID,
    employeeId: EMPLOYEE_ID,
    completedAt: "2026-05-16",
  }

  it("accepts minimal valid input", () => {
    expect(completeTrainingRecordFormSchema.safeParse(base).success).toBe(true)
  })

  it("accepts optional assignmentId", () => {
    const result = completeTrainingRecordFormSchema.safeParse({
      ...base,
      assignmentId: ASSIGNMENT_ID,
    })
    expect(result.success).toBe(true)
  })

  it("rejects missing completedAt", () => {
    const { completedAt: _ca, ...rest } = base
    expect(completeTrainingRecordFormSchema.safeParse(rest).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// verifyTrainingRecordFormSchema
// ---------------------------------------------------------------------------

describe("verifyTrainingRecordFormSchema", () => {
  it("accepts valid recordId", () => {
    const result = verifyTrainingRecordFormSchema.safeParse({
      organizationId: ORG_ID,
      orgSlug: ORG_SLUG,
      recordId: RECORD_ID,
    })
    expect(result.success).toBe(true)
  })

  it("rejects non-UUID recordId", () => {
    const result = verifyTrainingRecordFormSchema.safeParse({
      organizationId: ORG_ID,
      orgSlug: ORG_SLUG,
      recordId: "not-a-uuid",
    })
    expect(result.success).toBe(false)
  })
})
