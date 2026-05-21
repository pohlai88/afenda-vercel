export {
  HRM_TCI_AUDIT,
  type HrmTciAuditAction,
} from "./tci.contract"

export {
  HRM_TCI_SPEC_MAP,
  listHrmTciSpecCodes,
  type HrmTciSpecArea,
  type HrmTciSpecCode,
} from "./tci-spec-map.shared"

export {
  TCI_LIST_SURFACE_IDS,
  TCI_STAT_SURFACE_KEY,
  type TciListSurfaceId,
} from "./data/tci-surface-metadata.shared"

export {
  TCI_DEVICE_TYPES,
  TCI_DEVICE_STATES,
  TCI_PUNCH_EVENT_TYPES,
  TCI_EXCEPTION_STATES,
  TCI_DETECTION_OUTCOMES,
  type TciDeviceType,
  type TciDeviceState,
  type TciPunchEventType,
} from "./schemas/tci-workflow-state.shared"

export { TimeClockPage } from "./components/time-clock-page"

export {
  resolveTimeClockSurfaceAccess,
  type TimeClockSurfaceAccess,
} from "./data/tci-access.server"
