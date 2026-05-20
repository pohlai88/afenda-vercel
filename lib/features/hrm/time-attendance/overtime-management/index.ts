export {
  HRM_OTM_AUDIT,
  OTM_REQUEST_APPROVAL_SUBJECT_KIND,
  type HrmOtmAuditAction,
} from "./otm.contract"

export {
  HRM_OTM_SPEC_MAP,
  listHrmOtmSpecCodes,
  type HrmOtmSpecArea,
  type HrmOtmSpecCode,
} from "./otm-spec-map.shared"

export {
  HRM_OTM_DAY_CATEGORIES,
  HRM_OTM_INITIATED_BY,
  HRM_OTM_REQUEST_STATES,
  HRM_OTM_TIMING_KINDS,
  type HrmOtmDayCategory,
  type HrmOtmInitiatedBy,
  type HrmOtmRequestState,
  type HrmOtmTimingKind,
} from "./schemas/otm.schema"

export { OvertimePage } from "./components/overtime-page"
export { resolveOtmSurfaceAccess } from "./data/otm-access.server"

export type { OtmPolicyRow } from "./data/otm-policy.shared"
export type { OtmApprovalStage } from "./data/otm-approval-snapshot.shared"
