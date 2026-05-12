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
  listAllLeaveRequestsForOrg,
  listActiveEmployeeChoicesForLeave,
  listActiveLeaveTypesForOrg,
} from "./data/leave-request.queries.server"

export type {
  LeaveRequestRow,
  LeaveRequestDetailRow,
  LeaveBalanceRow,
  OrgLeaveRequestRow,
  LeaveEmployeeChoiceRow,
  LeaveTypeChoiceRow,
} from "./data/leave-request.queries.server"

export {
  isLeaveHalfDayOption,
  LEAVE_HALF_DAY_OPTIONS,
  leaveRequestStateTone,
} from "./data/leave-display.shared"

export type {
  LeaveHalfDayOption,
  LeaveRequestStateLabelTone,
} from "./data/leave-display.shared"

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
  listRecentAttendanceEventsForOrg,
  listActiveEmployeeChoicesForAttendance,
} from "./data/attendance.queries.server"

export type {
  AttendanceEventRow,
  AttendanceDayRow,
  OrgAttendanceEventRow,
  OrgAttendanceDayRow,
  AttendanceEmployeeChoiceRow,
} from "./data/attendance.queries.server"

export {
  ATTENDANCE_MANUAL_EVENT_TYPES,
  attendanceDayStateTone,
  attendanceEventTypeTone,
  formatMinutesAsHoursMinutes,
  isAttendanceManualEventType,
  isIsoDate,
  todayIsoDate,
} from "./data/attendance-display.shared"

export type {
  AttendanceDayStateTone,
  AttendanceEventTypeTone,
  AttendanceManualEventType,
} from "./data/attendance-display.shared"

// PR #3 — HR Documents Vault. Org-scoped library reads + employee
// filter choices used by the `/dashboard/hrm/documents` page composer.
// The per-employee `listHrmDocumentsForEmployee` continues to ship
// from the same module but is consumed only by the employee detail
// page; both reads scope by `organizationId` and are safe to call
// after `requireOrgSession`.
export {
  listEmployeeChoicesForDocumentFilter,
  listHrmDocumentsForEmployee,
  listHrmDocumentsForOrg,
} from "./data/hrm-document.queries.server"

export type {
  DocumentEmployeeChoiceRow,
  ListHrmDocumentsForOrgOptions,
  OrgHrmDocumentRow,
} from "./data/hrm-document.queries.server"

export {
  HRM_DOCUMENT_CLASSIFICATIONS,
  HRM_DOCUMENT_TYPES,
  formatHrmDocumentSize,
  hrmDocumentClassificationTone,
  hrmDocumentTypeTone,
  isHrmDocumentClassification,
  isHrmDocumentType,
  shortenPayloadHash,
} from "./data/hrm-document-display.shared"

export type {
  HrmDocumentClassification,
  HrmDocumentClassificationTone,
  HrmDocumentType,
  HrmDocumentTypeTone,
} from "./data/hrm-document-display.shared"

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
  // Phase 3J: webhook receiver lookup
  findEvidenceByDeliveryId,
} from "./data/compliance.queries.server"

export type { ComplianceEvidenceRow } from "./data/compliance.queries.server"

// Phase 3J: shared `submitted -> acknowledged` transition used by both the
// manual HR Server Action and the bureau webhook receiver.
export { acknowledgeEvidenceTransition } from "./data/compliance-acknowledgement.server"

export type {
  AcknowledgeEvidenceTransitionInput,
  AcknowledgeEvidenceTransitionResult,
} from "./data/compliance-acknowledgement.server"

// Phase 3K: per-evidence lifecycle timeline composer + shared types.
// `listComplianceEvidenceTimeline` is the single read used by the
// `/dashboard/hrm/compliance/[evidenceId]` surface; the shared mapping +
// kind types are re-exported so client islands and tests can consume them
// without pulling the server-only composer in.
export { listComplianceEvidenceTimeline } from "./data/compliance-timeline.queries.server"

export {
  COMPLIANCE_TIMELINE_KINDS,
  COMPLIANCE_TIMELINE_AUDIT_ACTIONS,
  COMPLIANCE_AUDIT_ACTION_TO_KIND,
  STATUTORY_PACK_EXPORT_AUDIT_ACTION,
  STATUTORY_PACK_REGENERATE_AUDIT_ACTION,
  complianceTimelineKindForAuditAction,
  isComplianceTimelineKind,
} from "./data/compliance-timeline.shared"

export type {
  ComplianceTimelineEntry,
  ComplianceTimelineKind,
} from "./data/compliance-timeline.shared"

// Phase 3L: cross-period operational health snapshot + classifier. The
// snapshot composer is the single read used by the Suspense-streamed
// operational health card on the compliance index. The pure classifier
// + bucket constants are re-exported so unit tests, future Nexus
// pressure projections, and cron alerters can reuse them without
// pulling the server-only composer.
export { getComplianceOperationalHealthSnapshot } from "./data/compliance-operational-health.queries.server"

export type {
  ComplianceHealthSampleRow,
  ComplianceHealthSnapshot,
} from "./data/compliance-operational-health.queries.server"

export {
  ageInDays,
  classifyComplianceEvidenceForOperationalHealth,
  COMPLIANCE_AGING_TIERS,
  COMPLIANCE_OPERATIONAL_HEALTH_AGING,
  COMPLIANCE_OPERATIONAL_HEALTH_ATTENTION_BUCKETS,
  COMPLIANCE_OPERATIONAL_HEALTH_BUCKETS,
  complianceAgingTiersCrossed,
  complianceAgingTierThresholdDays,
  effectiveAgeAnchorForRow,
  highestComplianceAgingTier,
  isAttentionBucket,
  isComplianceOperationalHealthBucket,
} from "./data/compliance-operational-health.shared"

export type {
  ComplianceAgingTier,
  ComplianceHealthAttentionBucket,
  ComplianceHealthClassifierRow,
  ComplianceHealthDisplayedBucket,
  ComplianceOperationalHealthBucket,
} from "./data/compliance-operational-health.shared"

export { buildStatutoryPackFromRuns } from "./data/statutory-pack.server"

export type {
  StatutoryPackRunInput,
  StatutoryPackLineInput,
  StatutoryPackResult,
} from "./data/statutory-pack.server"

export {
  STATUTORY_PACK_HASH_HEADER,
  STATUTORY_PACK_HASH_PREFIX,
  computeStatutoryPackResponseHash,
  formatStatutoryPackHashHeader,
  serializeStatutoryPackToCsv,
  statutoryPackFilename,
} from "./data/statutory-pack-csv.shared"

export type { StatutoryPackCsvResult } from "./data/statutory-pack-csv.shared"

export {
  STATUTORY_PACK_TO_EVENT_TYPE,
  STATUTORY_PACK_TO_ACK_EVENT_TYPE,
  STATUTORY_PACK_TO_AUTHORITY,
  ACKNOWLEDGEMENT_SOURCES,
  ackEventTypeForStatutoryPack,
  authorityForStatutoryPack,
  eventTypeForStatutoryPack,
  isAcknowledgementSource,
} from "./data/statutory-event-types.shared"
export type { AcknowledgementSource } from "./data/statutory-event-types.shared"

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

// Phase 3N: Per-bureau operational reliability projection. Pure
// composer + classifier are exported alongside the snapshot so unit
// tests, future Nexus pressure projections, and dashboards can reuse
// the math without pulling the server-only query in.
export {
  BUREAU_RELIABILITY_AUTHORITIES,
  BUREAU_RELIABILITY_CRITICAL_THRESHOLD,
  BUREAU_RELIABILITY_DEGRADED_THRESHOLD,
  BUREAU_RELIABILITY_HEALTH_LEVELS,
  BUREAU_RELIABILITY_MIN_SIGNAL_COUNT,
  BUREAU_RELIABILITY_WINDOW_DAYS,
  classifyBureauHealth,
  computeBureauReliabilitySummary,
  computeMedian,
  dayAge,
  isBureauReliabilityHealth,
} from "./data/bureau-reliability.shared"

export type {
  BureauReliabilityClassifierRow,
  BureauReliabilityHealth,
  BureauReliabilityRow,
  BureauReliabilitySnapshot,
} from "./data/bureau-reliability.shared"

export { getBureauReliabilitySnapshot } from "./data/bureau-reliability.queries.server"

// Phase 3M / 3O: System-observed aging watch (cron-driven). Records
// when `submitted` evidence rows cross each operational severity
// threshold so the per-evidence Phase 3K timeline reflects active
// monitoring at the right severity, rather than only human + bureau
// actions. Invoked by `app/api/cron/hrm-compliance-aging-watch`.
export {
  STATUTORY_AGING_WATCH_AUDIT_ACTION,
  STATUTORY_AGING_WATCH_AUDIT_ACTIONS,
  STATUTORY_AGING_WATCH_BATCH_LIMIT,
  buildAgingAuditMetadata,
  computeAgingThresholdAt,
  listAgingWatchCandidates,
  partitionAgingTierEmissions,
  runComplianceAgingWatchTick,
  tierEmissionsForCandidate,
} from "./data/compliance-aging-watch.server"

export type {
  AgingTierEmission,
  AgingWatchCandidate,
  AgingWatchTickSummary,
} from "./data/compliance-aging-watch.server"

// Phase 3P + 3Q: Compliance aging tier fanout. Best-effort signed
// outbound delivery on `org_event_delivery` triggered by the watch
// cron after each successful tier audit write. Orgs subscribe per
// tier (digest / on-call / pager). Pure helpers are exported so
// contract tests can lock the envelope shape and outcome-counter
// math without a database round-trip. Phase 3P critical-only names
// are preserved as aliases for back-compat.
export {
  HRM_COMPLIANCE_AGING_CRITICAL_EVENT_TYPE,
  HRM_COMPLIANCE_AGING_TIER_EVENT_TYPES,
  HRM_FANOUT_FORBIDDEN_KEYS,
  buildAgingCriticalEventEnvelopeData,
  buildAgingTierEventEnvelopeData,
  emptyAgingCriticalFanoutCounters,
  emptyAgingTierFanoutCounters,
  emptyAgingTierFanoutCountersByTier,
  fanoutAgingCriticalEvent,
  fanoutAgingTierEvent,
  tallyAgingCriticalFanoutOutcome,
  tallyAgingTierFanoutOutcome,
  tallyAgingTierFanoutOutcomeByTier,
} from "./data/compliance-aging-fanout.server"

export type {
  AgingCriticalFanoutCounters,
  AgingCriticalFanoutOutcome,
  AgingTierFanoutCounters,
  AgingTierFanoutCountersByTier,
  AgingTierFanoutOutcome,
} from "./data/compliance-aging-fanout.server"

// Phase 2 — Working Memory Rail pressure. Server-only query wrapped in
// `React.cache` so the layout (`app/[locale]/o/[orgSlug]/dashboard/hrm/
// layout.tsx`) and any future RSC consumers share a single round trip
// per request.
export { getHrmRailPressureCounts } from "./data/hrm-rail-pressure.queries.server"

// PR #4 — HR Policies workbench. Org-scoped reads for the leave-types
// catalog and effective-dated overlay timeline; the per-row mutation
// surface stays on the existing Phase 2A Server Actions. The display
// helpers + tab enum are pure (Server- and Client-Component safe).
export {
  getLeaveTypeForOrg,
  listAllLeaveTypesForOrg,
  listLeavePoliciesForOrg,
} from "./data/leave-policy.queries.server"

export type {
  LeavePolicyAdminRow,
  LeaveTypeAdminRow,
  ListLeavePoliciesForOrgOptions,
} from "./data/leave-policy.queries.server"

export {
  HRM_LEAVE_ACCRUAL_METHODS,
  HRM_POLICY_DEFAULT_TAB,
  HRM_POLICY_TABS,
  MY_EA_2023_LEAVE_TYPE_CODES,
  hrmLeaveAccrualMethodTone,
  hrmLeaveTypeStatusTone,
  isHrmLeaveAccrualMethod,
  isHrmPolicyTab,
  isMyEa2023LeaveTypeCode,
} from "./data/leave-policy-display.shared"

export type {
  HrmLeaveAccrualMethod,
  HrmLeaveAccrualMethodTone,
  HrmLeaveTypeStatusTone,
  HrmPolicyTab,
  MyEa2023LeaveTypeCode,
} from "./data/leave-policy-display.shared"

// Phase 4 — Claims (org-scoped reads for the kanban + drill-down +
// admin inbox + payroll-finalize bridge + HR Nexus pressure aggregator).
export {
  countApprovedUnpaidClaimsForOrg,
  countPendingClaimsForOrg,
  findClaimApproval,
  findOrgDocumentForClaim,
  findOrgEmployeeForClaim,
  getClaimDetail,
  getClaimTypeForOrg,
  listApprovedUnpaidClaimsForPeriod,
  listClaimsForEmployee,
  listClaimsForOrg,
  listClaimTypesForOrg,
  listPendingClaimApprovalsForOrg,
} from "./data/claim.queries.server"

export type {
  ClaimDetailRow,
  ClaimDocumentLite,
  ClaimEvidenceRow,
  ClaimRow,
  ClaimTypeRow,
} from "./data/claim.queries.server"
