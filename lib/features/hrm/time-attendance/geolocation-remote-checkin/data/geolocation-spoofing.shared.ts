/**
 * Client-safe spoofing heuristics for remote check-in (HRM-GEO-015).
 * Signals are advisory — the server merges client + server hints before validation.
 */

export const REMOTE_CHECKIN_SPOOFING_SIGNAL = {
  geoPermissionDenied: "geo_permission_denied",
  zeroCoordinates: "zero_coordinates",
  implausibleAccuracy: "implausible_accuracy",
  missingAccuracy: "missing_accuracy",
} as const

export type RemoteCheckinSpoofingSignal =
  (typeof REMOTE_CHECKIN_SPOOFING_SIGNAL)[keyof typeof REMOTE_CHECKIN_SPOOFING_SIGNAL]

const MAX_SIGNALS = 16

/** Serialize for hidden `spoofingSignals` form field (comma-separated). */
export function serializeRemoteCheckinSpoofingSignals(
  signals: readonly string[]
): string {
  return [...new Set(signals.map((s) => s.trim()).filter(Boolean))]
    .slice(0, MAX_SIGNALS)
    .join(",")
}

export function parseRemoteCheckinSpoofingSignals(
  raw: string | null | undefined
): string[] {
  if (!raw?.trim()) return []
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .slice(0, MAX_SIGNALS)
}

export function collectClientRemoteCheckinSpoofingSignals(input: {
  readonly geoStatus: "idle" | "pending" | "ready" | "denied"
  readonly latitude: string
  readonly longitude: string
  readonly accuracy: string
}): RemoteCheckinSpoofingSignal[] {
  const signals: RemoteCheckinSpoofingSignal[] = []

  if (input.geoStatus === "denied") {
    signals.push(REMOTE_CHECKIN_SPOOFING_SIGNAL.geoPermissionDenied)
  }

  const lat = Number.parseFloat(input.latitude)
  const lng = Number.parseFloat(input.longitude)
  const accuracy = Number.parseInt(input.accuracy, 10)

  if (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat === 0 &&
    lng === 0
  ) {
    signals.push(REMOTE_CHECKIN_SPOOFING_SIGNAL.zeroCoordinates)
  }

  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    signals.push(REMOTE_CHECKIN_SPOOFING_SIGNAL.missingAccuracy)
  } else if (accuracy > 5_000) {
    signals.push(REMOTE_CHECKIN_SPOOFING_SIGNAL.implausibleAccuracy)
  }

  return signals
}

export function deriveServerRemoteCheckinSpoofingSignals(input: {
  readonly latitude: number
  readonly longitude: number
  readonly gpsAccuracyMeters: number
}): RemoteCheckinSpoofingSignal[] {
  const signals: RemoteCheckinSpoofingSignal[] = []
  if (input.latitude === 0 && input.longitude === 0) {
    signals.push(REMOTE_CHECKIN_SPOOFING_SIGNAL.zeroCoordinates)
  }
  if (input.gpsAccuracyMeters <= 0) {
    signals.push(REMOTE_CHECKIN_SPOOFING_SIGNAL.missingAccuracy)
  } else if (input.gpsAccuracyMeters > 5_000) {
    signals.push(REMOTE_CHECKIN_SPOOFING_SIGNAL.implausibleAccuracy)
  }
  return signals
}

export function mergeRemoteCheckinSpoofingSignals(
  clientSignals: readonly string[] | null | undefined,
  serverSignals: readonly string[]
): string[] {
  const merged = [
    ...(clientSignals ?? []),
    ...serverSignals,
  ]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
  return [...new Set(merged)].slice(0, MAX_SIGNALS)
}
