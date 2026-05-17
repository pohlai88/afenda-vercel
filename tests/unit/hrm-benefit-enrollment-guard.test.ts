import { describe, expect, it } from "vitest"

import {
  describeBenefitEnrollmentCoverageConflict,
  detectBenefitEnrollmentCoverageConflict,
} from "../../lib/features/hrm/payroll-compensation/benefits-administration/data/benefit-enrollment-guard.shared.ts"

describe("benefit enrollment coverage guard", () => {
  it("allows reenrollment after a terminated coverage window ends", () => {
    const conflict = detectBenefitEnrollmentCoverageConflict({
      candidateStart: "2026-04-01",
      existing: [
        {
          enrollmentId: "enroll-1",
          state: "terminated",
          effectiveFrom: "2026-01-01",
          enrolledAt: "2026-01-01",
          terminatedAt: "2026-03-31",
        },
      ],
    })

    expect(conflict).toBeNull()
  })

  it("blocks a new enrollment that overlaps an active coverage window", () => {
    const conflict = detectBenefitEnrollmentCoverageConflict({
      candidateStart: "2026-03-01",
      existing: [
        {
          enrollmentId: "enroll-1",
          state: "active",
          effectiveFrom: "2026-02-01",
          enrolledAt: "2026-02-01",
          terminatedAt: null,
        },
      ],
    })

    expect(conflict).toMatchObject({
      enrollmentId: "enroll-1",
      state: "active",
      start: "2026-02-01",
      end: null,
    })
    expect(describeBenefitEnrollmentCoverageConflict(conflict!)).toContain(
      "active enrollment starting 2026-02-01"
    )
  })

  it("blocks retroactive reenrollment before a terminated coverage window ends", () => {
    const conflict = detectBenefitEnrollmentCoverageConflict({
      candidateStart: "2026-03-15",
      existing: [
        {
          enrollmentId: "enroll-1",
          state: "terminated",
          effectiveFrom: "2026-01-01",
          enrolledAt: "2026-01-01",
          terminatedAt: "2026-03-31",
        },
      ],
    })

    expect(conflict).toMatchObject({
      enrollmentId: "enroll-1",
      state: "terminated",
      start: "2026-01-01",
      end: "2026-03-31",
    })
  })

  it("ignores the current row when validating activation transitions", () => {
    const conflict = detectBenefitEnrollmentCoverageConflict({
      candidateStart: "2026-03-01",
      existing: [
        {
          enrollmentId: "enroll-1",
          state: "pending",
          effectiveFrom: "2026-03-01",
          enrolledAt: "2026-03-01",
          terminatedAt: null,
        },
      ],
      excludeEnrollmentId: "enroll-1",
    })

    expect(conflict).toBeNull()
  })
})
