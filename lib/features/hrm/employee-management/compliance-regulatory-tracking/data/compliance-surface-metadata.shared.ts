import {
  HRM_COMPLIANCE_FILING_CATEGORIES,
  HRM_COMPLIANCE_FILING_STATUSES,
  HRM_COMPLIANCE_STATUSES,
} from "./compliance-status.shared"

export const HRM_COMPLIANCE_SURFACE_COLUMNS = [
  { id: "employeeNumber", label: "Employee ID", valueType: "text" },
  { id: "legalName", label: "Employee", valueType: "text" },
  { id: "employmentStatus", label: "Employment", valueType: "enum" },
  { id: "overallStatus", label: "Compliance", valueType: "enum" },
  { id: "legalEntityCode", label: "Legal entity", valueType: "text" },
  { id: "departmentId", label: "Department", valueType: "reference" },
  { id: "workLocationCode", label: "Location", valueType: "text" },
  { id: "employmentType", label: "Employment type", valueType: "text" },
  { id: "workerCategory", label: "Worker category", valueType: "text" },
  { id: "documentMissing", label: "Missing docs", valueType: "number" },
  { id: "documentExpired", label: "Expired docs", valueType: "number" },
  { id: "trainingOverdue", label: "Overdue training", valueType: "number" },
  {
    id: "missingAcknowledgementCount",
    label: "Missing policy",
    valueType: "number",
  },
  { id: "openExceptionCount", label: "Open exceptions", valueType: "number" },
] as const

export const HRM_COMPLIANCE_SURFACE_FILTERS = [
  {
    id: "overallStatus",
    label: "Compliance",
    type: "enum",
    options: HRM_COMPLIANCE_STATUSES,
  },
  { id: "departmentId", label: "Department", type: "department" },
  { id: "workLocationCode", label: "Location", type: "text" },
  { id: "legalEntityCode", label: "Legal entity", type: "text" },
  { id: "employmentType", label: "Employment type", type: "text" },
  { id: "workerCategory", label: "Worker category", type: "text" },
] as const

export const HRM_COMPLIANCE_SURFACE_ROW_ACTIONS = [
  { id: "viewEmployee", label: "Employee", permission: "hrm.employee.search" },
  {
    id: "viewExceptions",
    label: "Exceptions",
    permission: "hrm.compliance.search",
  },
  {
    id: "updateException",
    label: "Corrective action",
    permission: "hrm.compliance.update",
  },
] as const

export const HRM_COMPLIANCE_FILING_SURFACE = {
  columns: [
    { id: "title", label: "Title", valueType: "text" },
    { id: "filingCategory", label: "Category", valueType: "enum" },
    { id: "status", label: "Status", valueType: "enum" },
    { id: "countryCode", label: "Country", valueType: "text" },
    { id: "legalEntityCode", label: "Legal entity", valueType: "text" },
    { id: "dueDate", label: "Due date", valueType: "date" },
  ],
  filters: [
    {
      id: "status",
      label: "Status",
      type: "enum",
      options: HRM_COMPLIANCE_FILING_STATUSES,
    },
    {
      id: "filingCategory",
      label: "Category",
      type: "enum",
      options: HRM_COMPLIANCE_FILING_CATEGORIES,
    },
    { id: "countryCode", label: "Country", type: "text" },
    { id: "dueOnOrBefore", label: "Due by", type: "date" },
  ],
} as const
