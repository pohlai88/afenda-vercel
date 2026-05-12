export {
  archiveEmployeeFormSchema,
  createEmployeeFormSchema,
  updateEmployeeFormSchema,
} from "./schemas/employee.schema"

export {
  createLeaveTypeFormSchema,
  updateLeaveTypeFormSchema,
  createLeavePolicyFormSchema,
} from "./schemas/leave-policy.schema"

export {
  applyLeaveFormSchema,
  cancelLeaveFormSchema,
  leaveApprovalDecisionSchema,
  leaveRejectDecisionSchema,
} from "./schemas/leave-request.schema"

export {
  recordAttendanceEventSchema,
  correctAttendanceEventSchema,
  regenerateAttendanceDaySchema,
  attendanceCsvRowSchema,
} from "./schemas/attendance-event.schema"

export {
  createPayrollPeriodFormSchema,
  updatePayrollPeriodFormSchema,
  preparePayrollRunsFormSchema,
} from "./schemas/payroll-period.schema"

export type {
  CreatePayrollPeriodFormValues,
  UpdatePayrollPeriodFormValues,
  PreparePayrollRunsFormValues,
} from "./schemas/payroll-period.schema"

export type {
  LeaveAccrualMethodValue,
  CreateLeaveTypeFormValues,
  UpdateLeaveTypeFormValues,
  CreateLeavePolicyFormValues,
} from "./schemas/leave-policy.schema"

export type {
  HalfDayOption,
  ApplyLeaveFormValues,
  CancelLeaveFormValues,
  LeaveApprovalDecisionValues,
  LeaveRejectDecisionValues,
} from "./schemas/leave-request.schema"

export type {
  RecordAttendanceEventInput,
  CorrectAttendanceEventInput,
  RegenerateAttendanceDayInput,
  AttendanceCsvRow,
} from "./schemas/attendance-event.schema"

export type {
  HrmCapability,
  HrmCapabilityId,
  HrmMinimumOrgRole,
  HrmNavKey,
  LeaveTypeMutationFormState,
  LeavePolicyMutationFormState,
  SeedLeaveTypesFormState,
  LeaveRequestMutationFormState,
  CancelLeaveFormState,
  LeaveApprovalFormState,
  AttendanceRecordFormState,
  AttendanceCorrectionFormState,
  RegenerateDayFormState,
  PayrollPeriodCreateFormState,
  PayrollPeriodUpdateFormState,
  PreparePayrollRunsFormState,
} from "./types"
export { HRM_NAV_NAMESPACE } from "./types"

export {
  buildHrmNav,
  getAllowedHrmDashboardSubsegments,
  getHrmAuditPrefixes,
  getHrmCapabilityById,
  getHrmCapabilityForSegment,
  hrmNavLabelKey,
  HRM_CAPABILITIES,
  isAllowedHrmDashboardSubsegment,
  organizationHrmComplianceDetailPath,
  organizationHrmEmployeePath,
  organizationHrmPath,
  organizationHrmRootPath,
  ORG_DASHBOARD_HRM,
} from "./constants"

export {
  HrmCapabilityPlaceholderPage,
  HrmOverviewPage,
} from "./components/hrm-pages"

export { buildHrmRailSlots } from "./data/hrm-rail-slots"

// Phase 2 — Working Memory Rail pressure types. The server-side query
// `getHrmRailPressureCounts` is exported from `#features/hrm/server` to
// keep this barrel client-safe; consumers like Client Components that
// need to read the badge shape import these types only.
export type {
  HrmRailPressureBadge,
  HrmRailPressureMap,
  HrmRailPressureTone,
} from "./types"

export { EmployeeDetailPage } from "./components/employee-detail-page"
export { WorkforcePage } from "./components/workforce-page"
export { PayrollConsolePage } from "./components/payroll-console"
export { CompliancePage } from "./components/compliance-page"
// Phase 3K: per-evidence lifecycle drill-down (regulator-ready artifact).
export { ComplianceEvidenceDetailPage } from "./components/compliance-evidence-detail-page"
// Phase 3L: Tier B Suspense-streamed cross-period operational health card.
export { ComplianceOperationalHealth } from "./components/compliance-operational-health"
export { ComplianceOperationalHealthSkeleton } from "./components/compliance-operational-health-skeleton"

// Phase 3N: Tier B Suspense-streamed per-bureau reliability card.
export { BureauReliabilityCard } from "./components/bureau-reliability-card"
export { BureauReliabilityCardSkeleton } from "./components/bureau-reliability-card-skeleton"
