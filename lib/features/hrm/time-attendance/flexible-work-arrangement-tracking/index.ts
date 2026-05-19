export {
  HRM_FWA_AUDIT,
  FWA_REQUEST_APPROVAL_SUBJECT_KIND,
  type HrmFwaAuditAction,
} from "./fwa.contract"

export {
  HRM_FWA_SPEC_MAP,
  listHrmFwaSpecCodes,
  type HrmFwaSpecArea,
  type HrmFwaSpecCode,
} from "./fwa-spec-map.shared"

export {
  FWA_LIST_SURFACE_IDS,
  type FwaListSurfaceId,
} from "./data/fwa-surface-metadata.shared"

export {
  HRM_FWA_ARRANGEMENT_KINDS,
  HRM_FWA_REQUEST_STATES,
  HRM_FWA_WORK_MODES,
  type HrmFwaArrangementKind,
  type HrmFwaRequestState,
} from "./schemas/fwa-workflow-state.shared"

export {
  FlexibleWorkPage,
  resolveFwaSurfaceAccess,
} from "./components/flexible-work-page"
