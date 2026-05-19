import {
  HRM_DOCUMENT_CLASSIFICATIONS,
  HRM_DOCUMENT_GROUPS,
  HRM_DOCUMENT_LIFECYCLE_STATUSES,
  HRM_DOCUMENT_TYPES,
  HRM_DOCUMENT_VERIFICATION_STATUSES,
} from "./hrm-document-display.shared"

export const HRM_DOCUMENT_SURFACE_COLUMNS = [
  { id: "employee", label: "Employee", valueType: "text" },
  { id: "documentType", label: "Document type", valueType: "enum" },
  { id: "documentGroup", label: "Document group", valueType: "enum" },
  { id: "classification", label: "Classification", valueType: "enum" },
  { id: "verificationStatus", label: "Verification", valueType: "enum" },
  { id: "documentLifecycleStatus", label: "Lifecycle", valueType: "enum" },
  { id: "versionNumber", label: "Version", valueType: "number" },
  { id: "isLatestVersion", label: "Latest", valueType: "boolean" },
  { id: "isMandatory", label: "Mandatory", valueType: "boolean" },
  { id: "effectiveTo", label: "Expiry", valueType: "date" },
  { id: "retentionUntil", label: "Retention until", valueType: "date" },
  { id: "uploadedAt", label: "Uploaded", valueType: "datetime" },
] as const

export const HRM_DOCUMENT_SURFACE_FILTERS = [
  { id: "employeeId", label: "Employee", type: "employee" },
  { id: "legalEntityId", label: "Legal entity", type: "legalEntity" },
  {
    id: "documentType",
    label: "Document type",
    type: "enum",
    options: HRM_DOCUMENT_TYPES,
  },
  {
    id: "documentGroup",
    label: "Document group",
    type: "enum",
    options: HRM_DOCUMENT_GROUPS,
  },
  {
    id: "classification",
    label: "Classification",
    type: "enum",
    options: HRM_DOCUMENT_CLASSIFICATIONS,
  },
  {
    id: "verificationStatus",
    label: "Verification",
    type: "enum",
    options: HRM_DOCUMENT_VERIFICATION_STATUSES,
  },
  {
    id: "documentLifecycleStatus",
    label: "Lifecycle",
    type: "enum",
    options: HRM_DOCUMENT_LIFECYCLE_STATUSES,
  },
  {
    id: "expiryStatus",
    label: "Expiry status",
    type: "enum",
    options: ["valid", "expiring_soon", "expired"],
  },
  { id: "uploadedFrom", label: "Uploaded from", type: "date" },
  { id: "uploadedTo", label: "Uploaded to", type: "date" },
  { id: "isMandatory", label: "Mandatory", type: "boolean" },
  { id: "latestOnly", label: "Latest only", type: "boolean" },
] as const

export const HRM_DOCUMENT_SURFACE_ROW_ACTIONS = [
  { id: "download", label: "Download", permission: "hrm.document.read" },
  { id: "verify", label: "Verify", permission: "hrm.document.update" },
  { id: "reject", label: "Reject", permission: "hrm.document.update" },
  { id: "replace", label: "Replace", permission: "hrm.document.update" },
  { id: "archive", label: "Archive", permission: "hrm.document.update" },
  { id: "delete", label: "Delete", permission: "hrm.document.delete" },
] as const

export const HRM_DOCUMENT_READINESS_SURFACE = {
  id: "hrm-document-readiness",
  counters: [
    "requiredCount",
    "readyCount",
    "missingCount",
    "pendingCount",
    "rejectedCount",
    "expiredCount",
  ],
} as const
