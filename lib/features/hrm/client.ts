export type { HrmCapability, HrmCapabilityId, HrmNavKey } from "./types"

export {
  activateContractAction,
  createDraftContractAction,
  terminateContractAction,
} from "./actions/employment-contract.actions"
export {
  archiveEmployeeAction,
  createEmployeeAction,
  updateEmployeeAction,
} from "./actions/employee.actions"
export { attachEmployeeDocumentAction } from "./actions/hrm-document.actions"
export {
  approveLeaveAction,
  rejectLeaveAction,
} from "./actions/leave-approval.actions"
export {
  applyLeaveAction,
  cancelLeaveAction,
} from "./actions/leave-request.actions"
export {
  createLeaveTypeAction,
  updateLeaveTypeAction,
  seedMalaysiaEa2023LeaveTypesAction,
  createLeavePolicyAction,
} from "./actions/leave-policy.actions"
export { upsertPayrollProfileAction } from "./actions/payroll-profile.actions"
export {
  correctAttendanceEventAction,
  recordAttendanceEventAction,
  regenerateAttendanceDayAction,
} from "./actions/attendance-correction.actions"

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

// Phase 3C: Compliance
export {
  generateAllStatutoryPacksAction,
  generateStatutoryPackAction,
  markEvidenceSubmittedAction,
} from "./actions/compliance.actions"

// Phase 3E: Outbound statutory submission via org_event_delivery outbox
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

// Phase 3H: Manual bureau acknowledgement (submitted -> acknowledged)
// Phase 3I: ack mutation now stamps acknowledgedAt / By / Source on the row.
export { acknowledgeStatutoryEvidenceAction } from "./actions/statutory-acknowledgement.actions"

export { CompliancePage } from "./components/compliance-page"

export type {
  AcknowledgeStatutoryEvidenceFormState,
  GenerateAllStatutoryPacksFormState,
  GenerateStatutoryPackFormState,
  MarkEvidenceSubmittedFormState,
  SubmitStatutoryEvidenceFormState,
} from "./types"
