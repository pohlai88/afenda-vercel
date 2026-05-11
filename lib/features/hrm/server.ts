export {
  createEmployeeMutation,
  updateEmployeeMutation,
} from "./data/employee.mutations.server"

export type {
  CreateEmployeeMutationInput,
  CreateEmployeeMutationResult,
  UpdateEmployeeMutationInput,
  UpdateEmployeeMutationResult,
} from "./data/employee.mutations.server"

export { upsertPayrollProfileMutation } from "./data/payroll-profile.mutations.server"

export type {
  ClaimTypeSeed,
  ContributionResult,
  HrmHolidaySeed,
  HrmPayrollProfileStub,
  LeaveTypeSeed,
  PayrollComputeInput,
  PayrollRulePack,
  StatutoryPackPayload,
  StatutoryPackType,
  StatutoryRuleVersion,
  TaxResult,
  ValidationIssue,
} from "./data/payroll-rule-pack.server"

export {
  resolveRulePack,
  RULE_PACK_REGISTRY,
} from "./data/payroll-rule-pack.server"

export {
  computeLeaveBalanceSummary,
  detectLeaveOverlap,
  buildLeaveApprovalSnapshot,
  recomputeLeaveBalance,
  readLeaveBalance,
} from "./data/leave-balance.server"

export type {
  LeaveRequestStateValue,
  HalfDayValue,
  LeaveApprovalSnapshot,
  LeaveBalanceSummary,
} from "./data/leave-balance.server"

export {
  listLeaveRequestsForEmployee,
  listPendingApprovalRequestsForOrg,
  getLeaveRequestDetail,
  listLeaveBalancesForEmployee,
} from "./data/leave-request.queries.server"

export type {
  LeaveRequestRow,
  LeaveRequestDetailRow,
  LeaveBalanceRow,
} from "./data/leave-request.queries.server"

// Phase 2C: Attendance
export {
  aggregateAttendanceDay,
  computeEventChecksum,
  regenerateAttendanceDayFromEvents,
} from "./data/attendance-aggregator.server"

export type {
  AttendanceEventType,
  AttendanceEventSource,
  AttendanceDayState,
  HrmAttendanceEventForAggregation,
  HrmAttendanceDayDraft,
  AttendanceCalculationSnapshot,
} from "./data/attendance-aggregator.server"

export {
  listAttendanceEventsForDate,
  getAttendanceEvent,
  getAttendanceDay,
  listAttendanceDaysForEmployee,
  listAttendanceDaysForPayroll,
} from "./data/attendance.queries.server"

export type {
  AttendanceEventRow,
  AttendanceDayRow,
} from "./data/attendance.queries.server"

// Phase 3A: Payroll preparation
export {
  computePayrollRun,
  derivePayrollTraceability,
} from "./data/payroll-engine.server"

export type {
  PayrollEngineInput,
  PayrollEngineResult,
  PayrollLineInput,
  PayrollPeriodTraceability,
} from "./data/payroll-engine.server"

export {
  listPayrollPeriodsForOrg,
  getPayrollPeriod,
  listPayrollRunsForPeriod,
  listPayrollLinesForRun,
  getPayrollRunInputSnapshot,
  isAttendancePayrollReadyForPeriod,
  hasApprovedPayrollPeriodLockApproval,
  getPendingPayrollPeriodLockApprovalId,
} from "./data/payroll.queries.server"

export type {
  PayrollPeriodRow,
  PayrollRunRow,
  PayrollLineRow,
} from "./data/payroll.queries.server"

// Phase 3C: Compliance evidence
export {
  listComplianceEvidenceForPeriod,
  listComplianceEvidenceForOrg,
  getComplianceEvidence,
  fetchRunsForStatutoryPack,
} from "./data/compliance.queries.server"

export type { ComplianceEvidenceRow } from "./data/compliance.queries.server"

export { buildStatutoryPackFromRuns } from "./data/statutory-pack.server"

export type {
  StatutoryPackRunInput,
  StatutoryPackLineInput,
  StatutoryPackResult,
} from "./data/statutory-pack.server"

export {
  STATUTORY_PACK_TO_EVENT_TYPE,
  eventTypeForStatutoryPack,
} from "./data/statutory-event-types.shared"

// Phase 3G: Auto-retry of failed statutory submissions (cron-driven).
// `runStatutoryRetryTick` is invoked by `app/api/cron/hrm-statutory-retry`.
export {
  STATUTORY_RETRY_BASE_DELAY_MS,
  STATUTORY_RETRY_MAX_ATTEMPTS,
  STATUTORY_RETRY_MAX_DELAY_MS,
  STATUTORY_RETRY_BATCH_LIMIT,
  listStatutoryRetryCandidates,
  nextStatutoryRetryAt,
  retryStatutorySubmissionForEvidence,
  runStatutoryRetryTick,
  shouldRetryStatutorySubmission,
  statutoryRetryDelayMs,
} from "./data/statutory-retry.server"

export type {
  StatutoryRetryCandidate,
  StatutoryRetryOutcome,
  StatutoryRetryTickSummary,
} from "./data/statutory-retry.server"
