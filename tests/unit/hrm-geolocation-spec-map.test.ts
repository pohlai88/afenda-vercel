import { describe, expect, it } from "vitest"

import {
  HRM_GEOLOCATION_SPEC_MAP,
  listHrmGeolocationSpecCodes,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/geolocation-spec-map.shared.ts"

/** Mirrors ARCHITECTURE.md enterprise functional requirements HRM-GEO-001 … 032. */
const ARCHITECTURE_GEOLOCATION_SPEC_MAP = {
  "HRM-GEO-001": "remote-clock-in-out",
  "HRM-GEO-002": "capture-payload",
  "HRM-GEO-003": "event-types",
  "HRM-GEO-004": "approved-locations",
  "HRM-GEO-005": "geofence-rules",
  "HRM-GEO-006": "geofence-validation",
  "HRM-GEO-007": "shift-window-validation",
  "HRM-GEO-008": "eligibility-validation",
  "HRM-GEO-009": "scope-restrictions",
  "HRM-GEO-010": "device-registration",
  "HRM-GEO-011": "device-suspicion-detection",
  "HRM-GEO-012": "gps-availability-detection",
  "HRM-GEO-013": "outside-geofence-flag",
  "HRM-GEO-014": "weak-accuracy-flag",
  "HRM-GEO-015": "spoof-detection",
  "HRM-GEO-016": "exception-submission",
  "HRM-GEO-017": "exception-workflow",
  "HRM-GEO-018": "approver-decisions",
  "HRM-GEO-019": "decision-reasons",
  "HRM-GEO-020": "selfie-verification",
  "HRM-GEO-021": "multi-location-support",
  "HRM-GEO-022": "client-site-reference",
  "HRM-GEO-023": "raw-vs-approved-separation",
  "HRM-GEO-024": "attendance-integration",
  "HRM-GEO-025": "overtime-reference",
  "HRM-GEO-026": "payroll-reference",
  "HRM-GEO-027": "access-control",
  "HRM-GEO-028": "precision-masking",
  "HRM-GEO-029": "no-continuous-tracking",
  "HRM-GEO-030": "operational-reports",
  "HRM-GEO-031": "notifications",
  "HRM-GEO-032": "audit-trail",
} as const

describe("HRM Geolocation spec map", () => {
  it("lists 32 requirement codes aligned with ARCHITECTURE.md", () => {
    const codes = listHrmGeolocationSpecCodes()
    expect(codes).toHaveLength(32)
    expect(codes[0]).toBe("HRM-GEO-001")
    expect(codes[31]).toBe("HRM-GEO-032")
    expect(HRM_GEOLOCATION_SPEC_MAP).toEqual(ARCHITECTURE_GEOLOCATION_SPEC_MAP)
  })
})
