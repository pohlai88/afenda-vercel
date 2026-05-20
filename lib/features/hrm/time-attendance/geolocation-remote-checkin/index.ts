export {
  HRM_GEOLOCATION_AUDIT,
  REMOTE_CHECKIN_EXCEPTION_SUBJECT_KIND,
  type HrmGeolocationAuditAction,
} from "./geolocation.contract"

export {
  HRM_GEOLOCATION_SPEC_MAP,
  listHrmGeolocationSpecCodes,
  type HrmGeolocationSpecArea,
  type HrmGeolocationSpecCode,
} from "./geolocation-spec-map.shared"

export {
  REMOTE_CHECKIN_LIST_SURFACE_IDS,
  REMOTE_CHECKIN_STAT_SURFACE_KEY,
  type RemoteCheckinListSurfaceId,
} from "./data/geolocation-surface-metadata.shared"

export {
  REMOTE_CHECKIN_DEVICE_STATES,
  REMOTE_CHECKIN_EVENT_TYPES,
  REMOTE_CHECKIN_EXCEPTION_STATES,
  REMOTE_CHECKIN_VERIFICATION_OUTCOMES,
  REMOTE_CHECKIN_POLICY_SCOPES,
  GEOFENCE_SCOPE_KINDS,
  type GeofenceScopeKind,
  type RemoteCheckinDeviceState,
  type RemoteCheckinEventType,
  type RemoteCheckinExceptionState,
  type RemoteCheckinPolicyScope,
  type RemoteCheckinVerificationOutcome,
} from "./schemas/geolocation-workflow-state.shared"

export {
  distanceBetweenCoordinatesMeters,
  maskLocationPrecision,
  remoteCheckinExceptionStateTone,
  remoteCheckinOutcomeTone,
  type RemoteCheckinExceptionStateTone,
  type RemoteCheckinOutcomeTone,
} from "./data/geolocation-display.shared"

export { GeolocationPage } from "./components/geolocation-page"

export {
  resolveGeolocationSurfaceAccess,
  type GeolocationSurfaceAccess,
} from "./data/geolocation-access.server"
