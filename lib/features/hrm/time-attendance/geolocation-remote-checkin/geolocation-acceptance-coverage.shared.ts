import type { HrmGeolocationSpecCode } from "./geolocation-spec-map.shared"

/**
 * HRM-GEO-001 … HRM-GEO-032 implementation traceability vs ARCHITECTURE.md.
 * `evidence` paths are relative to `geolocation-remote-checkin/`.
 */
export type GeolocationAcceptanceStatus = "shipped" | "partial" | "deferred"

export type GeolocationAcceptanceCoverageEntry = {
  readonly status: GeolocationAcceptanceStatus
  readonly acceptanceCriteria: readonly number[]
  readonly evidence: readonly string[]
  readonly note?: string
}

export const HRM_GEOLOCATION_ACCEPTANCE_COVERAGE: Record<
  HrmGeolocationSpecCode,
  GeolocationAcceptanceCoverageEntry
> = {
  "HRM-GEO-001": {
    status: "shipped",
    acceptanceCriteria: [1],
    evidence: [
      "actions/remote-checkin-capture.actions.ts",
      "components/remote-checkin-capture-form.client.tsx",
      "data/geolocation-access.server.ts",
    ],
  },
  "HRM-GEO-002": {
    status: "shipped",
    acceptanceCriteria: [2],
    evidence: [
      "schemas/geolocation.schema.ts",
      "data/remote-checkin-capture-commands.server.ts",
    ],
  },
  "HRM-GEO-003": {
    status: "shipped",
    acceptanceCriteria: [3],
    evidence: ["schemas/geolocation-workflow-state.shared.ts"],
  },
  "HRM-GEO-004": {
    status: "shipped",
    acceptanceCriteria: [4],
    evidence: [
      "actions/geofence.actions.ts",
      "data/geofence-commands.server.ts",
      "components/geolocation-geofences-section.tsx",
    ],
  },
  "HRM-GEO-005": {
    status: "shipped",
    acceptanceCriteria: [5],
    evidence: [
      "schemas/geolocation-workflow-state.shared.ts",
      "data/geofence-commands.server.ts",
    ],
  },
  "HRM-GEO-006": {
    status: "shipped",
    acceptanceCriteria: [6],
    evidence: ["data/geolocation-validation.server.ts"],
  },
  "HRM-GEO-007": {
    status: "shipped",
    acceptanceCriteria: [7],
    evidence: [
      "data/geolocation-validation.server.ts",
      "data/remote-checkin-capture-commands.server.ts",
    ],
  },
  "HRM-GEO-008": {
    status: "partial",
    acceptanceCriteria: [8],
    evidence: ["data/geolocation-validation.server.ts"],
    note: "Policy eligibility rules ship; per-employee assignment exceptions are exception-workflow only.",
  },
  "HRM-GEO-009": {
    status: "partial",
    acceptanceCriteria: [8],
    evidence: [
      "data/remote-checkin-policy-commands.server.ts",
      "schemas/geolocation-workflow-state.shared.ts",
    ],
    note: "Scoped policies (org/department/position/employment_type/policy_group/employee); not all HR dimensions wired in v1 UI.",
  },
  "HRM-GEO-010": {
    status: "shipped",
    acceptanceCriteria: [9],
    evidence: [
      "actions/remote-checkin-device.actions.ts",
      "data/remote-checkin-device-commands.server.ts",
    ],
  },
  "HRM-GEO-011": {
    status: "shipped",
    acceptanceCriteria: [9],
    evidence: ["data/geolocation-validation.server.ts"],
  },
  "HRM-GEO-012": {
    status: "shipped",
    acceptanceCriteria: [10],
    evidence: ["data/geolocation-validation.server.ts"],
  },
  "HRM-GEO-013": {
    status: "shipped",
    acceptanceCriteria: [11],
    evidence: ["data/geolocation-validation.server.ts"],
  },
  "HRM-GEO-014": {
    status: "shipped",
    acceptanceCriteria: [12],
    evidence: ["data/geolocation-validation.server.ts"],
  },
  "HRM-GEO-015": {
    status: "partial",
    acceptanceCriteria: [13],
    evidence: ["data/geolocation-validation.server.ts"],
    note: "Spoofing flag when policy.detectSpoofing; no dedicated anti-spoof SDK integration.",
  },
  "HRM-GEO-016": {
    status: "shipped",
    acceptanceCriteria: [14],
    evidence: [
      "actions/remote-checkin-capture.actions.ts",
      "data/remote-checkin-exception-commands.server.ts",
    ],
  },
  "HRM-GEO-017": {
    status: "shipped",
    acceptanceCriteria: [15],
    evidence: [
      "schemas/geolocation-workflow-state.shared.ts",
      "components/geolocation-pending-section.tsx",
    ],
  },
  "HRM-GEO-018": {
    status: "shipped",
    acceptanceCriteria: [16],
    evidence: [
      "actions/remote-checkin-exception.actions.ts",
      "data/remote-checkin-exception-commands.server.ts",
      "components/remote-checkin-decision-form.client.tsx",
    ],
  },
  "HRM-GEO-019": {
    status: "shipped",
    acceptanceCriteria: [17],
    evidence: ["data/remote-checkin-exception-commands.server.ts"],
  },
  "HRM-GEO-020": {
    status: "partial",
    acceptanceCriteria: [18],
    evidence: ["schemas/geolocation.schema.ts"],
    note: "selfieBlobUrl on capture schema; optional capture UI not exposed in v1 form.",
  },
  "HRM-GEO-021": {
    status: "shipped",
    acceptanceCriteria: [19],
    evidence: [
      "data/geofence-commands.server.ts",
      "components/geolocation-geofences-section.tsx",
    ],
  },
  "HRM-GEO-022": {
    status: "shipped",
    acceptanceCriteria: [20],
    evidence: ["schemas/geolocation-workflow-state.shared.ts"],
  },
  "HRM-GEO-023": {
    status: "shipped",
    acceptanceCriteria: [21],
    evidence: [
      "data/geolocation.queries.server.ts",
      "data/geolocation-aggregator.server.ts",
    ],
  },
  "HRM-GEO-024": {
    status: "shipped",
    acceptanceCriteria: [22],
    evidence: [
      "data/geolocation-integration.server.ts",
      "data/geolocation-aggregator.server.ts",
    ],
  },
  "HRM-GEO-025": {
    status: "partial",
    acceptanceCriteria: [23],
    evidence: ["data/geolocation-integration.server.ts"],
    note: "Exports overtimeMinutes from attendance_day; Overtime Management module does not consume yet.",
  },
  "HRM-GEO-026": {
    status: "partial",
    acceptanceCriteria: [24],
    evidence: ["data/geolocation-aggregator.server.ts"],
    note: "Approved outcomes land in hrm_attendance_day; Payroll module consumption is downstream of LAM.",
  },
  "HRM-GEO-027": {
    status: "shipped",
    acceptanceCriteria: [25],
    evidence: ["data/geolocation-access.server.ts"],
  },
  "HRM-GEO-028": {
    status: "shipped",
    acceptanceCriteria: [26],
    evidence: [
      "data/geolocation-display.shared.ts",
      "data/geolocation-report.server.ts",
      "data/geolocation-surface-builders.server.ts",
    ],
  },
  "HRM-GEO-029": {
    status: "shipped",
    acceptanceCriteria: [27],
    evidence: ["data/remote-checkin-capture-commands.server.ts"],
    note: "Event-sourced captures only; no background geolocation subscription in module.",
  },
  "HRM-GEO-030": {
    status: "shipped",
    acceptanceCriteria: [28],
    evidence: [
      "data/geolocation-report.server.ts",
      "actions/remote-checkin-report.actions.ts",
    ],
  },
  "HRM-GEO-031": {
    status: "deferred",
    acceptanceCriteria: [29],
    evidence: [],
    note: "No push/email notification emitter for exception lifecycle in v1.",
  },
  "HRM-GEO-032": {
    status: "shipped",
    acceptanceCriteria: [30],
    evidence: ["geolocation.contract.ts"],
  },
}

export function listGeolocationAcceptanceCriteria(): readonly number[] {
  const set = new Set<number>()
  for (const entry of Object.values(HRM_GEOLOCATION_ACCEPTANCE_COVERAGE)) {
    for (const ac of entry.acceptanceCriteria) {
      set.add(ac)
    }
  }
  return [...set].sort((a, b) => a - b)
}
