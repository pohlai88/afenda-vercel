import {
  HRM_EMPLOYMENT_STATUSES,
  HRM_LIFECYCLE_TRANSITION_STATUSES,
} from "./employee-lifecycle-stage.shared"

export const EMPLOYEE_LIFECYCLE_SURFACE_ID = "hrm.employee.lifecycle" as const

export const EMPLOYEE_LIFECYCLE_METADATA_COLUMNS = [
  { key: "employeeNumber", label: "Employee No.", kind: "text" },
  { key: "legalName", label: "Employee", kind: "text" },
  { key: "employmentStatus", label: "Status", kind: "status" },
  { key: "stage", label: "Lifecycle Stage", kind: "status" },
  { key: "effectiveDate", label: "Effective Date", kind: "date" },
  { key: "pendingTransitionCount", label: "Pending", kind: "number" },
  { key: "lastWorkingDate", label: "Last Working Date", kind: "date" },
  { key: "reason", label: "Reason", kind: "text" },
  { key: "approvalReference", label: "Approval Ref.", kind: "text" },
] as const

export const EMPLOYEE_LIFECYCLE_METADATA_FILTERS = [
  {
    key: "employmentStatus",
    label: "Employment Status",
    type: "select",
    options: HRM_EMPLOYMENT_STATUSES,
  },
  {
    key: "transitionStatus",
    label: "Transition Status",
    type: "select",
    options: HRM_LIFECYCLE_TRANSITION_STATUSES,
  },
  { key: "employeeId", label: "Employee", type: "employee" },
  { key: "departmentId", label: "Department", type: "department" },
  { key: "managerEmployeeId", label: "Manager", type: "employee" },
  { key: "asOfDate", label: "As of Date", type: "date" },
  { key: "includePending", label: "Include Pending", type: "boolean" },
] as const

export const EMPLOYEE_LIFECYCLE_METADATA_ROW_ACTIONS = [
  {
    key: "recordProbationOutcome",
    label: "Record Probation Outcome",
    permission: "hrm.employee.update",
  },
  {
    key: "confirmEmployment",
    label: "Confirm Employment",
    permission: "hrm.employee.update",
  },
  {
    key: "recordMovement",
    label: "Record Movement",
    permission: "hrm.employee.update",
  },
  {
    key: "startOffboarding",
    label: "Start Offboarding",
    permission: "hrm.employee.update",
  },
] as const

export const EMPLOYEE_LIFECYCLE_READINESS_COUNTERS = [
  { key: "onboardingOpen", label: "Open Onboarding" },
  { key: "offboardingOpen", label: "Open Offboarding" },
  { key: "probationDue", label: "Probation Due" },
  { key: "contractExpiryDue", label: "Contract Expiry Due" },
  { key: "pendingTransitions", label: "Pending Transitions" },
] as const
