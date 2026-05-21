/** HRM-TCI-001 … HRM-TCI-030 area tags (see ARCHITECTURE.md). */
export const HRM_TCI_SPEC_MAP = {
  "HRM-TCI-001": "integration-sources",
  "HRM-TCI-002": "device-types",
  "HRM-TCI-003": "device-registry",
  "HRM-TCI-004": "device-metadata",
  "HRM-TCI-005": "employee-mapping",
  "HRM-TCI-006": "clock-in-out",
  "HRM-TCI-007": "break-punches",
  "HRM-TCI-008": "automated-sync",
  "HRM-TCI-009": "manual-import",
  "HRM-TCI-010": "api-ingest",
  "HRM-TCI-011": "scheduled-sync",
  "HRM-TCI-012": "offline-replay",
  "HRM-TCI-013": "deduplication",
  "HRM-TCI-014": "active-employee-validation",
  "HRM-TCI-015": "mapping-validation",
  "HRM-TCI-016": "punch-classification",
  "HRM-TCI-017": "missing-punch-detection",
  "HRM-TCI-018": "duplicate-detection",
  "HRM-TCI-019": "abnormal-punch-detection",
  "HRM-TCI-020": "shift-matching",
  "HRM-TCI-021": "attendance-handoff",
  "HRM-TCI-022": "overtime-reference",
  "HRM-TCI-023": "payroll-reference",
  "HRM-TCI-024": "correction-workflow",
  "HRM-TCI-025": "correction-access-control",
  "HRM-TCI-026": "sync-monitoring",
  "HRM-TCI-027": "device-admin-access",
  "HRM-TCI-028": "operational-reports",
  "HRM-TCI-029": "raw-vs-approved-separation",
  "HRM-TCI-030": "audit-trail",
} as const

export type HrmTciSpecCode = keyof typeof HRM_TCI_SPEC_MAP

export type HrmTciSpecArea = (typeof HRM_TCI_SPEC_MAP)[HrmTciSpecCode]

export function listHrmTciSpecCodes(): readonly HrmTciSpecCode[] {
  return Object.keys(HRM_TCI_SPEC_MAP) as HrmTciSpecCode[]
}
