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
    status: "shipped",
    acceptanceCriteria: [8],
    evidence: [
      "data/geolocation-policy-resolution.server.ts",
      "data/geolocation-policy-resolution.shared.ts",
      "data/geolocation-validation.server.ts",
      "data/remote-checkin-capture-commands.server.ts",
    ],
  },
  "HRM-GEO-009": {
    status: "shipped",
    acceptanceCriteria: [8],
    evidence: [
      "data/geolocation-policy-resolution.server.ts",
      "components/remote-checkin-policy-form.client.tsx",
      "components/geolocation-policies-section.tsx",
      "schemas/geolocation.schema.ts",
    ],
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
    status: "shipped",
    acceptanceCriteria: [13],
    evidence: [
      "data/geolocation-spoofing.shared.ts",
      "data/geolocation-validation.server.ts",
      "components/remote-checkin-capture-form.client.tsx",
      "data/remote-checkin-capture-commands.server.ts",
    ],
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
    status: "shipped",
    acceptanceCriteria: [18],
    evidence: [
      "schemas/geolocation.schema.ts",
      "components/remote-checkin-selfie-field.client.tsx",
      "components/remote-checkin-capture-form.client.tsx",
      "components/geolocation-page.tsx",
    ],
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
    status: "shipped",
    acceptanceCriteria: [23],
    evidence: [
      "data/geolocation-integration.server.ts",
      "server.ts",
    ],
    note: "Overtime compare reads getRemoteCheckinOvertimeMinutesForWorkDate from lib/features/hrm/time-attendance/overtime-management/data/otm-calculation.server.ts.",
  },
  "HRM-GEO-026": {
    status: "shipped",
    acceptanceCriteria: [24],
    evidence: [
      "data/geolocation-aggregator.server.ts",
      "data/geolocation-integration.server.ts",
    ],
    note: "Payroll locks `hrm_attendance_day` populated by the geolocation aggregator.",
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
    status: "shipped",
    acceptanceCriteria: [29],
    evidence: [
      "data/geolocation-notification.server.ts",
      "data/remote-checkin-capture-commands.server.ts",
      "data/remote-checkin-exception-commands.server.ts",
    ],
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
