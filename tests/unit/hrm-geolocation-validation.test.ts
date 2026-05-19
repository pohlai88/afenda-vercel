import { describe, expect, it } from "vitest"

import {
  evaluateRemoteCheckinValidation,
  type RemoteCheckinValidationInput,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/data/geolocation-validation.server.ts"
import type {
  GeofenceRow,
  RemoteCheckinDeviceRow,
  RemoteCheckinEmployeeContextRow,
  RemoteCheckinPolicyRow,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/data/geolocation.queries.server.ts"
import type { RecordRemoteCheckinFormInput } from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/schemas/geolocation.schema.ts"

const TEST_ORG_ID = "00000000-0000-4000-8000-000000000001"
const TEST_EMPLOYEE_ID = "00000000-0000-4000-8000-000000000002"
const TEST_DEVICE_ID = "00000000-0000-4000-8000-000000000003"
const TEST_GEOFENCE_ID = "00000000-0000-4000-8000-000000000004"
const TEST_POLICY_ID = "00000000-0000-4000-8000-000000000005"

const BASE_EMPLOYEE = {
  id: TEST_EMPLOYEE_ID,
  employeeNumber: "EMP-001",
  legalName: "Test Employee",
  managerEmployeeId: null,
  archivedAt: null,
} as const satisfies RemoteCheckinEmployeeContextRow

const BASE_POLICY = {
  id: TEST_POLICY_ID,
  organizationId: TEST_ORG_ID,
  scopeKind: "org",
  scopeRef: null,
  minGpsAccuracyMeters: 50,
  allowedRadiusBufferMeters: 25,
  shiftWindowMinutes: 30,
  breakWindowMinutes: 15,
  requireRegisteredDevice: false,
  requireSelfie: false,
  detectSpoofing: true,
  allowEligibilityException: true,
  isActive: true,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} as const satisfies RemoteCheckinPolicyRow

const BASE_DEVICE = {
  id: TEST_DEVICE_ID,
  organizationId: TEST_ORG_ID,
  employeeId: TEST_EMPLOYEE_ID,
  employeeNumber: "EMP-001",
  employeeLegalName: "Test Employee",
  deviceLabel: "iPhone 17",
  deviceFingerprint: "fingerprint-abc",
  state: "active",
  lastSeenAt: new Date("2026-01-15T12:00:00.000Z"),
  lastIpAddress: null,
  revokedAt: null,
  revokedReason: null,
  createdAt: new Date("2026-01-10T00:00:00.000Z"),
} as const satisfies RemoteCheckinDeviceRow

const BASE_GEOFENCE = {
  id: TEST_GEOFENCE_ID,
  organizationId: TEST_ORG_ID,
  code: "HQ",
  label: "Headquarters",
  scopeKind: "office",
  latitude: "1.300000",
  longitude: "103.800000",
  radiusMeters: 75,
  bufferMeters: 25,
  countryCode: "SG",
  legalEntityCode: null,
  notes: null,
  archivedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
} as const satisfies GeofenceRow

const BASE_CAPTURE: RecordRemoteCheckinFormInput = {
  eventType: "clock_in",
  occurredAtIso: "2026-01-15T09:00:00.000Z",
  latitude: 1.300001,
  longitude: 103.800001,
  gpsAccuracyMeters: 10,
  deviceId: "fingerprint-abc",
  deviceLabel: null,
  deviceFingerprint: null,
  remoteLocationLabel: null,
  geofenceId: TEST_GEOFENCE_ID,
  selfieBlobUrl: null,
  capturedClientIp: null,
  spoofingSignals: [],
}

function buildInput(
  overrides: Partial<RemoteCheckinValidationInput> = {}
): RemoteCheckinValidationInput {
  return {
    capture: BASE_CAPTURE,
    policy: BASE_POLICY,
    employee: BASE_EMPLOYEE,
    device: BASE_DEVICE,
    nearestGeofence: BASE_GEOFENCE,
    nearestDistanceMeters: 5,
    assignedShift: {
      scheduledStartAt: new Date("2026-01-15T09:00:00.000Z"),
      scheduledEndAt: new Date("2026-01-15T17:00:00.000Z"),
    },
    ...overrides,
  }
}

describe("evaluateRemoteCheckinValidation", () => {
  it("returns verified when all rules pass", () => {
    expect(evaluateRemoteCheckinValidation(buildInput())).toEqual({
      ok: true,
      outcome: "verified",
    })
  })

  it("flags archived employees as ineligible", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        employee: {
          ...BASE_EMPLOYEE,
          archivedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("ineligible_employee")
  })

  it("flags missing device when policy requires registration", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        policy: { ...BASE_POLICY, requireRegisteredDevice: true },
        device: null,
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("ineligible_device")
  })

  it("flags inactive devices when policy requires registration", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        policy: { ...BASE_POLICY, requireRegisteredDevice: true },
        device: { ...BASE_DEVICE, state: "revoked" },
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("ineligible_device")
  })

  it("flags missing GPS when all coordinates are zero", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        capture: {
          ...BASE_CAPTURE,
          latitude: 0,
          longitude: 0,
          gpsAccuracyMeters: 0,
        },
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("missing_gps")
  })

  it("flags weak accuracy when capture accuracy exceeds policy", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        capture: { ...BASE_CAPTURE, gpsAccuracyMeters: 200 },
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("weak_accuracy")
  })

  it("flags spoofing when signals are present and detection is on", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        capture: { ...BASE_CAPTURE, spoofingSignals: ["mock_location"] },
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("spoof_suspected")
  })

  it("flags outside_geofence when capture is beyond radius + buffer", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        nearestDistanceMeters: 500,
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("outside_geofence")
  })

  it("flags outside_shift_window when capture is outside assigned shift", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        capture: {
          ...BASE_CAPTURE,
          occurredAtIso: "2026-01-15T19:00:00.000Z",
        },
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("outside_shift_window")
  })

  it("flags missing_selfie when policy requires it", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        policy: { ...BASE_POLICY, requireSelfie: true },
        capture: { ...BASE_CAPTURE, selfieBlobUrl: null },
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("missing_selfie")
  })

  it("verifies capture even with no geofence when policy scope is org-wide", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        nearestGeofence: null,
        nearestDistanceMeters: null,
      })
    )
    expect(result).toEqual({ ok: true, outcome: "verified" })
  })

  it("flags outside_geofence when no geofence resolves for non-org policy", () => {
    const result = evaluateRemoteCheckinValidation(
      buildInput({
        policy: { ...BASE_POLICY, scopeKind: "department" },
        nearestGeofence: null,
        nearestDistanceMeters: null,
      })
    )
    expect(result.ok).toBe(false)
    expect((result as { outcome: string }).outcome).toBe("outside_geofence")
  })
})
