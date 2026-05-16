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

export {
  deriveEmployeeMasterCompleteness,
  getEmployeeMasterRecordForOrganization,
} from "./data/employee-master.queries.server"

export {
  listDepartmentsForOrg,
  listEmployeeAssignmentHistory,
  listJobGradesForOrg,
  listOrgStructureEmployeePlacements,
  listOrgStructureSnapshot,
  listOrgUnitTree,
  listPositionControlRows,
  listPositionsForOrg,
  validateOrgStructureHealth,
} from "./data/org-structure.queries.server"

export type {
  DepartmentListRow,
  EmployeeAssignmentHistoryRow,
  JobGradeListRow,
  OrgStructureEmployeePlacementRow,
  OrgStructureHealthIssue,
  OrgStructureSnapshot,
  OrgUnitTreeRow,
  PositionControlRow,
  PositionListRow,
} from "./data/org-structure.queries.server"

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

export {
  buildLeaveRequestPolicySnapshot,
  computeCarryForwardExpiry,
  computeLeaveRequestDuration,
  validateLeavePolicyForRequest,
} from "./data/leave-absence.shared"

export { resolveLeaveSurfaceAccess } from "./data/leave-access.server"
export type { LeaveSurfaceAccess } from "./data/leave-access.server"

export { resolveLeaveRequestCalendar } from "./data/leave-calendar.server"
export type { LeaveRequestCalendar } from "./data/leave-calendar.server"

export type {
  LeavePolicyIssue,
  LeavePolicyIssueCode,
  LeavePolicyValidationResult,
  LeaveRequestPolicySnapshot,
} from "./data/leave-absence.shared"

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
  findLeaveEmployeeForUser,
  getLeaveEmployeeForOrg,
  getLeaveTypeForRequest,
  resolveLeaveApproverUserId,
  resolveManagerApproverUserId,
} from "./data/leave-request.queries.server"

export type {
  LeaveRequestRow,
  LeaveRequestDetailRow,
  LeaveBalanceRow,
  OrgLeaveRequestRow,
  LeaveEmployeeChoiceRow,
  LeaveTypeChoiceRow,
  LeaveEmployeeContextRow,
  LeaveTypeContextRow,
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

/** Attendance aggregation + queries (events, day rollups). */
export {
  aggregateAttendanceDay,
  attendanceSnapshotHasPayrollBlockingException,
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
  AttendanceException,
  AttendanceExceptionCode,
  AttendanceExceptionSeverity,
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
  assignEmployeeShiftAction,
  createShiftTemplateAction,
} from "./actions/attendance-shift.actions"

export {
  getShiftAssignmentForEmployeeDate,
  listShiftTemplatesForOrg,
  resolveAttendanceShiftContext,
  shiftAssignmentRowToView,
  shiftTemplateRowToOption,
} from "./data/attendance-shift.queries.server"

export type {
  ShiftAssignmentRow,
  ShiftTemplateRow,
} from "./data/attendance-shift.queries.server"

export type {
  AttendanceShiftAssignmentView,
  AttendanceShiftTemplateOption,
  AttendanceShiftContext,
  RegenerateAttendanceDayResult,
  ShiftHolidayBehavior,
} from "./data/attendance-shift.shared"

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

/** HR documents vault reads (org library + employee filter choices). */
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

/** Payroll preparation engine + period/run reads. */
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
  listPayrollLinesForPeriod,
  getPayrollRunInputSnapshot,
  isAttendancePayrollReadyForPeriod,
  hasApprovedPayrollPeriodLockApproval,
  getApprovedPayrollPeriodLockApproval,
  getPendingPayrollPeriodLockApprovalId,
  getPayrollPeriodPrimaryCountryCode,
} from "./data/payroll.queries.server"

export type {
  PayrollPeriodRow,
  PayrollRunRow,
  PayrollLineRow,
  PayrollPeriodLockApprovalRow,
} from "./data/payroll.queries.server"

export {
  buildPayrollCloseSnapshot,
  buildPayrollPostingPreview,
  buildPayslipSnapshotForRun,
  listPayrollCloseExceptions,
  persistPayrollPayslipSnapshots,
} from "./data/payroll-close.server"

export type {
  PayrollCloseActionFormState,
  PayrollCloseChecklistItem,
  PayrollCloseException,
  PayrollCloseSnapshot,
  PayrollPayslipSnapshot,
  PayrollPostingPreview,
} from "./data/payroll-close.shared"

export {
  buildPayrollPostingRecord,
  getPayrollPostingRecord,
  postPayrollPeriod,
} from "./data/payroll-posting.server"

export type {
  PayrollPostingRecord,
  PayrollPostingRecordLine,
  PayrollPostingResult,
  PayrollPostingState,
} from "./data/payroll-posting.shared"

/** Compliance evidence reads (period/org scope, delivery lookup). */
export {
  listComplianceEvidenceForPeriod,
  listComplianceEvidenceForOrg,
  getComplianceEvidence,
  fetchRunsForStatutoryPack,
  findEvidenceByDeliveryId,
} from "./data/compliance.queries.server"

export type { ComplianceEvidenceRow } from "./data/compliance.queries.server"

/** Shared `submitted` → `acknowledged` transition (manual action + bureau webhook). */
export { acknowledgeEvidenceTransition } from "./data/compliance-acknowledgement.server"

export type {
  AcknowledgeEvidenceTransitionInput,
  AcknowledgeEvidenceTransitionResult,
} from "./data/compliance-acknowledgement.server"

/** Per-evidence compliance timeline read + shared kind mapping (client-safe re-exports). */
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

/** Cross-period compliance operational health snapshot + pure classifiers. */
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

/** Auto-retry of failed statutory submissions (`app/api/cron/hrm-statutory-retry`). */
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

/** Per-bureau reliability snapshot + pure classifier (HTTP delivery signals). */
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

/** System-observed compliance aging watch (`app/api/cron/hrm-compliance-aging-watch`). */
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

/** Compliance aging tier fanout — signed outbound delivery after tier audit writes. */
export {
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

/** HRM rail pressure counts (`React.cache` in layout). */
export {
  getCompliancePressureAggregateForOrg,
  getHrmRailPressureCounts,
} from "./data/hrm-rail-pressure.queries.server"

export { getHrmSnapshotBoard } from "./data/hrm-snapshot.queries.server"
export type { HrmSnapshotBoard } from "./data/hrm-snapshot.queries.server"

/** Leave policy + leave type catalog reads (admin policies workbench). */
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

/** Claims reads (org scope, approvals, payroll bridge). */
export {
  countApprovedUnpaidClaimsForOrg,
  countPendingClaimsForOrg,
  canUploadClaimEvidenceForUser,
  findClaimEmployeeForUser,
  findClaimApproval,
  findOrgDocumentForClaim,
  findOrgEmployeeForClaim,
  getClaimDetail,
  getClaimTypeForOrg,
  listClaimsForCurrentEmployee,
  listApprovedUnpaidClaimsForPeriod,
  listClaimsForEmployee,
  listClaimsForOrg,
  listClaimsForOrgPage,
  listClaimTypesForOrg,
  listPendingClaimApprovalsForOrg,
  resolveClaimApproverUserId,
  sumClaimsForEmployeeClaimTypeWindow,
} from "./data/claim.queries.server"
export {
  resolveClaimSurfaceAccess,
} from "./data/claim-access.server"

/** Benefits administration reads (plans, enrollments, life events). */
export {
  buildBenefitCensusReportForOrganization,
  evaluateBenefitEligibilityForEmployee,
  getBenefitPlanEnterpriseVersionForOrganization,
  listBenefitPayrollProjectionEnrollmentsForPeriod,
  listBenefitPlanEnterpriseVersionsForOrganization,
  projectBenefitPayrollLinesForEmployeePeriod,
} from "./data/benefit-enterprise.queries.server"

export type {
  BenefitEligibilityEvaluation,
  BenefitPayrollProjectionQueryOptions,
  BuildBenefitCensusReportForOrganizationOptions,
  EvaluateBenefitEligibilityForEmployeeOptions,
  ListBenefitPlanEnterpriseVersionsForOrganizationOptions,
} from "./data/benefit-enterprise.queries.server"

export {
  countPendingBenefitEnrollmentsForOrganization,
  getBenefitEnrollmentForOrganization,
  getBenefitLifeEventForOrganization,
  getBenefitPlanForOrganization,
  listBenefitEnrollmentsForOrganization,
  listBenefitPlansForOrganization,
  listEnrollmentsForEmployee,
  listEnrollmentsForPlan,
  listLifeEventsForEmployee,
  listLifeEventsForOrganization,
} from "./data/benefit.queries.server"

export type {
  BenefitEnrollmentListRow,
  BenefitLifeEventRow,
  BenefitPlanRow,
} from "./data/benefit-model.shared"

export type {
  ClaimDetailRow,
  ClaimDocumentLite,
  ClaimEvidenceRow,
  ClaimRow,
  ClaimTypeRow,
} from "./data/claim.queries.server"
export type { ClaimSurfaceAccess } from "./data/claim-access.server"

/** Document expiry watch pure helpers + cron tick summary types. */
export {
  buildDocumentExpiryAuditMetadata,
  computeDocumentExpiryCutoff,
  daysToExpiry,
  DOCUMENT_EXPIRY_LOOKAHEAD_DAYS,
  DOCUMENT_EXPIRY_TIERS,
  DOCUMENT_EXPIRY_TIER_AUDIT_ACTIONS,
  DOCUMENT_EXPIRY_TIER_THRESHOLD_DAYS,
  DOCUMENT_EXPIRY_WATCH_BATCH_LIMIT,
  documentExpiryTiersCrossed,
  partitionDocumentExpiryEmissions,
} from "./data/document-expiry-watch.shared"

export type {
  DocumentExpiryCandidate,
  DocumentExpiryTier,
  DocumentExpiryTierEmission,
} from "./data/document-expiry-watch.shared"

export {
  listDocumentExpiryCandidates,
  runDocumentExpiryWatchTick,
} from "./data/document-expiry-watch.server"

export type { DocumentExpiryWatchTickSummary } from "./data/document-expiry-watch.server"

export {
  PROBATION_REVIEW_DUE_AUDIT_ACTION,
  PROBATION_WATCH_BATCH_LIMIT,
  probationReviewWindowBounds,
} from "./data/probation-watch.shared"

export type { ProbationReviewCandidate } from "./data/probation-watch.shared"

export {
  listProbationReviewCandidates,
  runProbationWatchTick,
} from "./data/probation-watch.server"

export type { ProbationWatchTickSummary } from "./data/probation-watch.server"

/** HR pressure rows merged into Nexus snapshot (pure rank helpers + server read). */
export {
  claimPriorityForAge,
  documentPriorityForTier,
  leavePriorityForAge,
  mergeAndTrimPressureRows,
} from "./data/hrm-nexus-pressure.shared"

export type { HrmPressureRowForNexus } from "./data/hrm-nexus-pressure.shared"

export { listHrmHighPressureForNexus } from "./data/hrm-nexus-pressure.queries.server"

export {
  parseCsv,
  dryRunAttendance,
  dryRunEmployees,
  dryRunPayroll,
} from "./data/hrm-import-csv.shared"

export { listTimeReportsForOrg } from "./data/time-report.queries.server"
export type { OrgTimeReportRow } from "./data/time-report.queries.server"
