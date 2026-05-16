export type {
  HrmCapability,
  HrmCapabilityId,
  HrmNavKey,
  RecruitmentMutationFormState,
} from "./types"

export {
  grantEmployeePortalAccessAction,
  revokeEmployeePortalAccessAction,
} from "./actions/employee-portal-access.actions"
export {
  activateContractAction,
  createDraftContractAction,
  createSalaryRevisionDraftAction,
  terminateContractAction,
} from "./actions/employment-contract.actions"
export { completeOnboardingStepAction } from "./actions/onboarding.actions"
export {
  acknowledgeReviewAction,
  activateReviewCycleAction,
  cancelReviewAction,
  closeReviewCycleAction,
  createReviewCycleAction,
  submitReviewAction,
} from "./actions/performance.actions"
export {
  acceptJobOfferAction,
  advanceApplicationStageAction,
  advanceApplicationStageFormAction,
  approveJobOfferAction,
  cancelJobRequisitionAction,
  cancelJobRequisitionFormAction,
  convertAcceptedOfferToEmployeeAction,
  convertAcceptedOfferToEmployeeFormAction,
  createCandidateApplicationAction,
  createCandidateApplicationFormAction,
  createJobOfferAction,
  createJobOfferFormAction,
  createJobRequisitionAction,
  createJobRequisitionFormAction,
  publishJobRequisitionAction,
  publishJobRequisitionFormAction,
  rejectJobOfferAction,
  scheduleInterviewAction,
  scheduleInterviewFormAction,
  sendJobOfferAction,
  submitInterviewFeedbackAction,
  submitInterviewFeedbackFormAction,
  updateJobOfferStatusAction,
  withdrawJobOfferAction,
} from "./actions/recruitment.actions"
export {
  createKpiPeriodAction,
  upsertKpiScoreAction,
} from "./actions/kpi.actions"
export {
  submitAddKpiGoalMilestoneAction,
  submitCloseKpiGoalAction,
  submitCreateKpiGoalAction,
  submitDeleteKpiGoalAction,
  submitDeleteKpiGoalCommentAction,
  submitPostKpiGoalCommentAction,
  submitRemoveKpiGoalMilestoneAction,
  submitUpdateKpiGoalAction,
  submitUpdateKpiGoalMilestoneAction,
} from "./actions/kpi-goal.actions"
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
  updateEmployeeContactAction,
  updateEmployeeEmploymentAction,
  updateEmployeeIdentityAction,
  updateEmployeeStatutoryProfileAction,
  upsertEmployeeIdentityDocumentAction,
  upsertEmployeeWorkAuthorizationAction,
} from "./actions/employee-master.actions"
export {
  archiveDepartmentAction,
  archiveOrgUnitAction,
  archiveJobGradeAction,
  archivePositionAction,
  assignEmployeePlacementAction,
  createDepartmentAction,
  createOrgUnitAction,
  createJobGradeAction,
  createPositionAction,
  setPositionReportingLineAction,
  updateJobGradeAction,
  updateOrgUnitAction,
  updatePositionAction,
} from "./actions/org-structure.actions"
export { attachEmployeeDocumentAction } from "./actions/hrm-document.actions"
export {
  approveLeaveAction,
  rejectLeaveAction,
} from "./actions/leave-approval.actions"
export {
  cancelPortalEmployeeLeaveAction,
  requestPortalEmployeeLeaveAction,
} from "./actions/employee-portal-leave.actions"
export {
  attachPortalEmployeeClaimEvidenceAction,
  cancelPortalEmployeeClaimAction,
  submitPortalEmployeeClaimAction,
} from "./actions/employee-portal-claim.actions"
export { requestPortalEmployeeAttendanceCorrectionAction } from "./actions/employee-portal-attendance.actions"
export {
  requestPortalEmployeeDocumentAction,
  type PortalDocumentRequestFormState,
} from "./actions/employee-portal-document.actions"
export {
  adjustLeaveBalanceAction,
  applyLeaveAction,
  applyLeaveOnBehalfAction,
  cancelLeaveAction,
  requestOwnLeaveAction,
  runLeaveCarryForwardAction,
} from "./actions/leave-request.actions"
export type {
  EmployeePortalAccessFormState,
  LeaveBalanceAdjustmentFormState,
  LeaveCarryForwardFormState,
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
export {
  assignEmployeeShiftAction,
  createShiftTemplateAction,
} from "./actions/attendance-shift.actions"
export type {
  AssignEmployeeShiftFormState,
  AttendanceRecordFormState,
  AttendanceCorrectionFormState,
  CreateShiftTemplateFormState,
  RegenerateDayFormState,
} from "./types"

export {
  createPayrollPeriodAction,
  updatePayrollPeriodAction,
  preparePayrollRunsAction,
  lockPayrollPeriodAction,
} from "./actions/payroll-period.actions"

export {
  generatePayrollPayslipsAction,
  postPayrollPeriodAction,
  publishPayrollPayslipsAction,
  refreshPayrollCloseSnapshotAction,
} from "./actions/payroll-close.actions"

export type {
  PayrollCloseActionFormState,
  PayrollCloseChecklistItem,
  PayrollCloseException,
  PayrollCloseSnapshot,
  PayrollPayslipSnapshot,
  PayrollPostingPreview,
} from "./data/payroll-close.shared"

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
  organizationHrmClaimPath,
  organizationHrmClaimsPath,
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
  submitClaimOnBehalfAction,
  submitOwnClaimAction,
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
  requestOwnClaimFormSchema,
  submitClaimFormSchema,
} from "./schemas/claim.schema"
export type {
  AttachClaimEvidenceFormValues,
  CancelClaimFormValues,
  ClaimApprovalDecisionValues,
  ClaimRejectDecisionValues,
  RequestOwnClaimFormValues,
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

/** Bulk HR import — commit and rollback governed sessions. */
export {
  commitImportSessionAction,
  rollbackImportSessionAction,
} from "./actions/hrm-import.actions"
