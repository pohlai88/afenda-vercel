import { describe, expect, it } from "vitest"

import {
  HRM_FWA_SPEC_MAP,
  listHrmFwaSpecCodes,
} from "../../lib/features/hrm/time-attendance/flexible-work-arrangement-tracking/fwa-spec-map.shared.ts"

/** Mirrors ARCHITECTURE.md enterprise functional requirements HRM-FWA-001 … 032. */
const ARCHITECTURE_FWA_SPEC_MAP = {
  "HRM-FWA-001": "arrangement-types",
  "HRM-FWA-002": "arrangement-kinds",
  "HRM-FWA-003": "eligibility-rules",
  "HRM-FWA-004": "employee-request",
  "HRM-FWA-005": "manager-hr-initiate",
  "HRM-FWA-006": "request-capture",
  "HRM-FWA-007": "eligibility-validation",
  "HRM-FWA-008": "exception-approval",
  "HRM-FWA-009": "approval-workflow",
  "HRM-FWA-010": "approval-routing",
  "HRM-FWA-011": "approver-decisions",
  "HRM-FWA-012": "decision-reasons",
  "HRM-FWA-013": "schedule-pattern",
  "HRM-FWA-014": "schedule-enforcement",
  "HRM-FWA-015": "compressed-schedule",
  "HRM-FWA-016": "remote-locations",
  "HRM-FWA-017": "geo-restrictions",
  "HRM-FWA-018": "office-day-minimum",
  "HRM-FWA-019": "remote-day-maximum",
  "HRM-FWA-020": "working-hours-compliance",
  "HRM-FWA-021": "policy-breach",
  "HRM-FWA-022": "attendance-integration",
  "HRM-FWA-023": "remote-checkin-integration",
  "HRM-FWA-024": "leave-validation",
  "HRM-FWA-025": "leave-schedule-exposure",
  "HRM-FWA-026": "overtime-reference",
  "HRM-FWA-027": "payroll-reference",
  "HRM-FWA-028": "review-renewal-dates",
  "HRM-FWA-029": "notifications",
  "HRM-FWA-030": "operational-reports",
  "HRM-FWA-031": "action-authorization",
  "HRM-FWA-032": "audit-trail",
} as const

describe("HRM FWA spec map", () => {
  it("lists 32 requirement codes aligned with ARCHITECTURE.md", () => {
    const codes = listHrmFwaSpecCodes()
    expect(codes).toHaveLength(32)
    expect(codes[0]).toBe("HRM-FWA-001")
    expect(codes[31]).toBe("HRM-FWA-032")
    expect(HRM_FWA_SPEC_MAP).toEqual(ARCHITECTURE_FWA_SPEC_MAP)
  })
})
