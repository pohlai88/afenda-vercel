import type {
  RemoteCheckinExceptionState,
  RemoteCheckinVerificationOutcome,
} from "../schemas/geolocation-workflow-state.shared"

export type RemoteCheckinExceptionStateTone =
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted"

export function remoteCheckinExceptionStateTone(
  state: RemoteCheckinExceptionState
): RemoteCheckinExceptionStateTone {
  switch (state) {
    case "approved":
    case "corrected":
      return "success"
    case "rejected":
      return "danger"
    case "returned":
      return "warning"
    case "submitted":
      return "info"
    case "cancelled":
    default:
      return "muted"
  }
}

export type RemoteCheckinOutcomeTone = "success" | "warning" | "danger"

export function remoteCheckinOutcomeTone(
  outcome: RemoteCheckinVerificationOutcome
): RemoteCheckinOutcomeTone {
  switch (outcome) {
    case "verified":
      return "success"
    case "weak_accuracy":
    case "outside_shift_window":
    case "missing_selfie":
      return "warning"
    case "outside_geofence":
    case "missing_gps":
    case "ineligible_employee":
    case "ineligible_device":
    case "spoof_suspected":
    default:
      return "danger"
  }
}

/**
 * Reduce GPS precision for users without detailed-location permission
 * (HRM-GEO-028). Truncates each coordinate to ~1km precision (3 decimals)
 * by default; granularity can be tightened per row by the caller.
 */
export function maskLocationPrecision(
  latitude: number | string | null,
  longitude: number | string | null,
  options: { decimals?: number } = {}
): { latitude: number | null; longitude: number | null } {
  const decimals = options.decimals ?? 2
  const factor = 10 ** decimals
  const lat = coerceNumeric(latitude)
  const lng = coerceNumeric(longitude)
  return {
    latitude: lat == null ? null : Math.round(lat * factor) / factor,
    longitude: lng == null ? null : Math.round(lng * factor) / factor,
  }
}

function coerceNumeric(value: number | string | null): number | null {
  if (value == null) return null
  const n = typeof value === "string" ? Number(value) : value
  return Number.isFinite(n) ? n : null
}

/**
 * Haversine distance in meters between two coordinates — used by the
 * validation engine to compare a capture against geofence centers.
 */
export function distanceBetweenCoordinatesMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const EARTH_RADIUS_M = 6_371_000
  const toRadians = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRadians(b.latitude - a.latitude)
  const dLng = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)
  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}
