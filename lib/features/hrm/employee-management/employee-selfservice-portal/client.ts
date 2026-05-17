/** Server Actions and client-safe types for Employee Self-Service Portal. */

export {
  grantEmployeePortalAccessAction,
  revokeEmployeePortalAccessAction,
} from "./actions/employee-portal-access.actions"

export {
  acknowledgePortalPolicyAction,
} from "./actions/employee-portal-acknowledgement.actions"

export {
  submitEmployeePortalRequestAdvance,
  submitEmployeePortalCancelPendingAdvance,
} from "./actions/employee-portal-advance.actions"

export { requestPortalEmployeeAttendanceCorrectionAction } from "./actions/employee-portal-attendance.actions"

export {
  submitEmployeePortalEnrollBenefit,
  submitEmployeePortalCancelPendingEnrollment,
  submitEmployeePortalRecordLifeEvent,
} from "./actions/employee-portal-benefit.actions"

export {
  attachPortalEmployeeClaimEvidenceAction,
  cancelPortalEmployeeClaimAction,
  submitPortalEmployeeClaimAction,
} from "./actions/employee-portal-claim.actions"

export {
  downloadPortalEmployeeDocumentAction,
  requestPortalEmployeeDocumentAction,
  submitPortalEmployeeDocumentAction,
  type PortalDocumentRequestFormState,
} from "./actions/employee-portal-document.actions"

export {
  requestPortalEmployeeLeaveAction,
  cancelPortalEmployeeLeaveAction,
} from "./actions/employee-portal-leave.actions"

export { completePortalOffboardingTaskAction } from "./actions/employee-portal-offboarding.actions"

export {
  updatePortalPersonalProfileAction,
  updatePortalEmergencyContactAction,
  updatePortalBankingProfileAction,
} from "./actions/employee-portal-profile.actions"

export {
  declinePortalSignatureAction,
  recordPortalSignatureViewAction,
  submitPortalSignatureAction,
} from "./actions/employee-portal-signature.actions"

export {
  portalSelfAttestTrainingAction,
  portalSubmitTrainingFeedbackAction,
  type PortalTrainingFormState,
} from "./actions/training-portal.actions"
