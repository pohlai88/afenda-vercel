import { describe, expect, it } from "vitest"

import {
  collectClientRemoteCheckinSpoofingSignals,
  deriveServerRemoteCheckinSpoofingSignals,
  mergeRemoteCheckinSpoofingSignals,
  REMOTE_CHECKIN_SPOOFING_SIGNAL,
  serializeRemoteCheckinSpoofingSignals,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/data/geolocation-spoofing.shared.ts"

describe("geolocation spoofing signals", () => {
  it("collects client signals for denied geolocation and zero coordinates", () => {
    const signals = collectClientRemoteCheckinSpoofingSignals({
      geoStatus: "denied",
      latitude: "0",
      longitude: "0",
      accuracy: "0",
    })
    expect(signals).toContain(
      REMOTE_CHECKIN_SPOOFING_SIGNAL.geoPermissionDenied
    )
    expect(signals).toContain(REMOTE_CHECKIN_SPOOFING_SIGNAL.zeroCoordinates)
    expect(signals).toContain(REMOTE_CHECKIN_SPOOFING_SIGNAL.missingAccuracy)
  })

  it("merges client and server signals without duplicates", () => {
    const merged = mergeRemoteCheckinSpoofingSignals(
      ["mock_location"],
      [REMOTE_CHECKIN_SPOOFING_SIGNAL.zeroCoordinates]
    )
    expect(merged).toEqual(["mock_location", "zero_coordinates"])
  })

  it("serializes for hidden form field", () => {
    expect(
      serializeRemoteCheckinSpoofingSignals([
        REMOTE_CHECKIN_SPOOFING_SIGNAL.implausibleAccuracy,
        "extra",
      ])
    ).toBe("implausible_accuracy,extra")
  })

  it("derives server signals for implausible accuracy", () => {
    expect(
      deriveServerRemoteCheckinSpoofingSignals({
        latitude: 1.3,
        longitude: 103.8,
        gpsAccuracyMeters: 6_000,
      })
    ).toContain(REMOTE_CHECKIN_SPOOFING_SIGNAL.implausibleAccuracy)
  })
})
