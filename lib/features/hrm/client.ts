export type { HrmCapability, HrmCapabilityId, HrmNavKey } from "./types"

export {
  activateContractAction,
  createDraftContractAction,
  createSalaryRevisionDraftAction,
  terminateContractAction,
} from "./actions/employment-contract.actions"
export { completeOnboardingStepAction } from "./actions/onboarding.actions"
export {
  acknowledgeReviewAction,
  createReviewCycleAction,
  submitReviewAction,
} from "./actions/performance.actions"
export {
  createKpiPeriodAction,
  upsertKpiScoreAction,
} from "./actions/kpi.actions"
export {
  decideSalaryAdvanceAction,
  requestSalaryAdvanceAction,
} from "./actions/salary-advance.actions"
export {
  archiveDependentAction,
  createDependentAction,
} from "./actions/dependent.actions"
export {
  archiveEmployeeAction,
  createEmployeeAction,
  updateEmployeeAction,
} from "./actions/employee.actions"
export {
  archiveDepartmentAction,
  archiveJobGradeAction,
  archivePositionAction,
  createDepartmentAction,
  createJobGradeAction,
  createPositionAction,
} from "./actions/org-structure.actions"
export { attachEmployeeDocumentAction } from "./actions/hrm-document.actions"
export {
  approveLeaveAction,
  rejectLeaveAction,
} from "./actions/leave-approval.actions"
export {
  applyLeaveAction,
  cancelLeaveAction,
} from "./actions/leave-request.actions"
export type {
  LeaveApprovalFormState,
  LeaveRequestMutationFormState,
  CancelLeaveFormState,
} from "./types"
export {
  createLeaveTypeAction,
  updateLeaveTypeAction,
  seedMalaysiaEa2023LeaveTypesAction,
  createLeavePolicyAction,
} from "./actions/leave-policy.actions"
export type {
  LeaveTypeMutationFormState,
  LeavePolicyMutationFormState,
  OrgStructureFormState,
  SeedLeaveTypesFormState,
} from "./types"
export { upsertPayrollProfileAction } from "./actions/payroll-profile.actions"
export {
  correctAttendanceEventAction,
  recordAttendanceEventAction,
  regenerateAttendanceDayAction,
} from "./actions/attendance-correction.actions"
export type {
  AttendanceRecordFormState,
  AttendanceCorrectionFormState,
  RegenerateDayFormState,
} from "./types"

export {
  createPayrollPeriodAction,
  updatePayrollPeriodAction,
  preparePayrollRunsAction,
  lockPayrollPeriodAction,
} from "./actions/payroll-period.actions"

export {
  requestPayrollPeriodLockApprovalAction,
  approvePayrollPeriodLockApprovalAction,
  rejectPayrollPeriodLockApprovalAction,
} from "./actions/payroll-lock-approval.actions"

export {
  PayrollConsolePage,
  PayrollPeriodDetailCard,
  PayrollRunTable,
  PayrollTraceabilityPanel,
  CreatePayrollPeriodForm,
  PreparePayrollRunsButton,
} from "./components/payroll-console"

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

/** Compliance statutory pack generation + evidence state actions. */
export {
  generateAllStatutoryPacksAction,
  generateStatutoryPackAction,
  markEvidenceSubmittedAction,
} from "./actions/compliance.actions"

/** Outbound statutory submission via org event delivery. */
export { submitStatutoryEvidenceForDeliveryAction } from "./actions/statutory-submission.actions"
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

/** Manual bureau acknowledgement (`submitted` → `acknowledged`, stamps actor metadata). */
export { acknowledgeStatutoryEvidenceAction } from "./actions/statutory-acknowledgement.actions"

export { CompliancePage } from "./components/compliance-page"

/** Benefits administration (Phase 5) — plan catalog + enrollments + life events. */
export {
  createBenefitPlanAction,
  updateBenefitPlanAction,
  archiveBenefitPlanAction,
} from "./actions/benefit-plan.actions"
export {
  enrollBenefitAction,
  activateBenefitEnrollmentAction,
  waiveBenefitEnrollmentAction,
  terminateBenefitEnrollmentAction,
} from "./actions/benefit-enrollment.actions"
export {
  recordLifeEventAction,
  verifyLifeEventAction,
} from "./actions/benefit-life-event.actions"
export type {
  BenefitPlanMutationFormState,
  BenefitArchiveFormState,
  BenefitEnrollFormState,
  BenefitEnrollmentTransitionFormState,
  RecordLifeEventFormState,
  VerifyLifeEventFormState,
  AcknowledgeStatutoryEvidenceFormState,
  GenerateAllStatutoryPacksFormState,
  GenerateStatutoryPackFormState,
  MarkEvidenceSubmittedFormState,
  SubmitStatutoryEvidenceFormState,
} from "./types"

/** Claims submission + admin decision actions. */
export {
  attachClaimEvidenceAction,
  cancelClaimAction,
  submitClaimAction,
} from "./actions/claim-submission.actions"
export {
  approveClaimAction,
  rejectClaimAction,
} from "./actions/claim-approval.actions"
export type {
  AttachClaimEvidenceFormState,
  CancelClaimFormState,
  ClaimApprovalFormState,
  SubmitClaimFormState,
} from "./types"
export {
  attachClaimEvidenceFormSchema,
  cancelClaimFormSchema,
  claimApprovalDecisionSchema,
  claimRejectDecisionSchema,
  submitClaimFormSchema,
} from "./schemas/claim.schema"
export type {
  AttachClaimEvidenceFormValues,
  CancelClaimFormValues,
  ClaimApprovalDecisionValues,
  ClaimRejectDecisionValues,
  SubmitClaimFormValues,
} from "./schemas/claim.schema"
export {
  CLAIM_EVIDENCE_TYPES,
  CLAIM_STATES,
  isClaimEvidenceType,
  isClaimState,
} from "./data/claim-helpers.shared"
export type {
  ClaimApprovalSnapshot,
  ClaimEvidenceType,
  ClaimsCountsSummary,
  ClaimStateValue,
} from "./data/claim-helpers.shared"

export {
  submitTimeReportAction,
  cancelTimeReportAction,
} from "./actions/time-report.actions"
export {
  approveTimeReportAction,
  rejectTimeReportAction,
} from "./actions/time-report-approval.actions"
export type {
  CancelTimeReportFormState,
  TimeReportApprovalFormState,
  TimeReportMutationFormState,
} from "./types"
