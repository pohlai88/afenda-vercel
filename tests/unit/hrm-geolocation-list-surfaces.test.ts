import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { parseListSurfaceRendererConfiguration } from "../../lib/features/governed-surface/schemas/list-surface-renderer.schema.ts"
import {
  REMOTE_CHECKIN_LIST_SURFACE_IDS,
  REMOTE_CHECKIN_STAT_SURFACE_KEY,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/data/geolocation-surface-metadata.shared.ts"
import {
  buildGeofencesListSurfaceConfiguration,
  buildRemoteCheckinDevicesListSurfaceConfiguration,
  buildRemoteCheckinHistoryListSurfaceConfiguration,
  buildRemoteCheckinKpiStatConfiguration,
  buildRemoteCheckinPendingListSurfaceConfiguration,
  buildRemoteCheckinPoliciesListSurfaceConfiguration,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/data/geolocation-surface-builders.server.ts"
import type {
  GeofenceRow,
  RemoteCheckinDeviceRow,
  RemoteCheckinExceptionListRow,
  RemoteCheckinHistoryRow,
  RemoteCheckinPolicyRow,
} from "../../lib/features/hrm/time-attendance/geolocation-remote-checkin/data/geolocation.queries.server.ts"

const ORG_ID = "00000000-0000-4000-8000-000000000001"

const GEOFENCE_ROW = {
  id: "00000000-0000-4000-8000-000000000010",
  organizationId: ORG_ID,
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

const POLICY_ROW = {
  id: "00000000-0000-4000-8000-000000000020",
  organizationId: ORG_ID,
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

const DEVICE_ROW = {
  id: "00000000-0000-4000-8000-000000000030",
  organizationId: ORG_ID,
  employeeId: "00000000-0000-4000-8000-000000000031",
  employeeNumber: "EMP-001",
  employeeLegalName: "Test Employee",
  deviceLabel: "iPhone 17",
  deviceFingerprint: "fp-abc",
  state: "active",
  lastSeenAt: new Date("2026-01-15T12:00:00.000Z"),
  lastIpAddress: null,
  revokedAt: null,
  revokedReason: null,
  createdAt: new Date("2026-01-10T00:00:00.000Z"),
} as const satisfies RemoteCheckinDeviceRow

const PENDING_ROW = {
  id: "00000000-0000-4000-8000-000000000040",
  organizationId: ORG_ID,
  employeeId: "00000000-0000-4000-8000-000000000031",
  state: "submitted",
  eventType: "clock_in",
  occurredAt: new Date("2026-01-15T09:05:00.000Z"),
  latitude: "1.300100",
  longitude: "103.800100",
  gpsAccuracyMeters: 12,
  deviceId: "00000000-0000-4000-8000-000000000030",
  remoteLocationLabel: null,
  geofenceId: GEOFENCE_ROW.id,
  selfieBlobUrl: null,
  detectionOutcome: "outside_geofence",
  reason: "Outside HQ boundary",
  decisionReason: null,
  decidedAt: null,
  decidedByUserId: null,
  resolvedEventId: null,
  createdAt: new Date("2026-01-15T09:06:00.000Z"),
  employeeNumber: "EMP-001",
  employeeLegalName: "Test Employee",
} as const satisfies RemoteCheckinExceptionListRow

const HISTORY_ROW = {
  id: "00000000-0000-4000-8000-000000000050",
  employeeId: "00000000-0000-4000-8000-000000000031",
  employeeNumber: "EMP-001",
  employeeLegalName: "Test Employee",
  eventType: "clock_in",
  occurredAt: new Date("2026-01-15T09:00:00.000Z"),
  latitude: "1.300000",
  longitude: "103.800000",
  gpsAccuracyMeters: 10,
  deviceId: DEVICE_ROW.id,
  geofenceId: GEOFENCE_ROW.id,
  geofenceLabel: "Headquarters",
  locationVerificationOutcome: "verified",
  selfieBlobUrl: null,
  createdAt: new Date("2026-01-15T09:00:30.000Z"),
} as const satisfies RemoteCheckinHistoryRow

describe("HRM Geolocation surface builders", () => {
  it("builds KPI stat configuration with tone escalations", () => {
    const configuration = buildRemoteCheckinKpiStatConfiguration(
      {
        verifiedTodayCount: 12,
        pendingExceptionCount: 4,
        outsideGeofenceTodayCount: 0,
        weakAccuracyTodayCount: 0,
        activeGeofenceCount: 3,
        registeredDeviceCount: 9,
      },
      {
        verifiedToday: "Verified",
        pendingExceptions: "Pending",
        outsideGeofence: "Outside",
        weakAccuracy: "Weak",
        activeGeofences: "Geofences",
        registeredDevices: "Devices",
      }
    )

    expect(configuration.stats).toHaveLength(6)
    expect(configuration.stats[1]?.tone).toBe("attention")
    expect(configuration.stats[2]?.tone).toBe("default")
    expect(REMOTE_CHECKIN_STAT_SURFACE_KEY).toBeTypeOf("string")
  })

  it("builds geofence list surface with editable trailing actions for managers", () => {
    const configuration = buildGeofencesListSurfaceConfiguration(
      [GEOFENCE_ROW],
      {
        empty: "Empty",
        colCode: "Code",
        colLabel: "Label",
        colScope: "Kind",
        colCenter: "Center",
        colRadius: "Radius",
        colArchived: "Active",
        yesNo: (value) => (value ? "Yes" : "No"),
        editLabel: "Edit",
      },
      { canManage: true }
    )

    expect(parseListSurfaceRendererConfiguration(configuration).success).toBe(true)
    expect(configuration.surface.columnsId).toBe(
      REMOTE_CHECKIN_LIST_SURFACE_IDS.geofences
    )
    expect(configuration.rows[0]?.trailingAction?.state).toBe("ready")
  })

  it("hides geofence trailing actions when manage is denied", () => {
    const configuration = buildGeofencesListSurfaceConfiguration(
      [GEOFENCE_ROW],
      {
        empty: "Empty",
        colCode: "Code",
        colLabel: "Label",
        colScope: "Kind",
        colCenter: "Center",
        colRadius: "Radius",
        colArchived: "Active",
        yesNo: (value) => (value ? "Yes" : "No"),
        editLabel: "Edit",
      },
      { canManage: false }
    )
    expect(configuration.rows[0]?.trailingAction?.state).toBe("hidden")
  })

  it("builds policy list surface with edit affordance", () => {
    const configuration = buildRemoteCheckinPoliciesListSurfaceConfiguration(
      [POLICY_ROW],
      {
        empty: "Empty",
        colScope: "Scope",
        colMinAccuracy: "Accuracy",
        colShiftWindow: "Shift",
        colDevice: "Device",
        colSelfie: "Selfie",
        colSpoof: "Spoof",
        colActive: "Active",
        yesNo: (value) => (value ? "Yes" : "No"),
        editLabel: "Edit",
      },
      { canManage: true }
    )

    expect(parseListSurfaceRendererConfiguration(configuration).success).toBe(true)
    expect(configuration.rows[0]?.trailingAction?.state).toBe("ready")
  })

  it("builds device list surface and chooses revoke label for active state", () => {
    const configuration = buildRemoteCheckinDevicesListSurfaceConfiguration(
      [DEVICE_ROW],
      {
        empty: "Empty",
        colEmployee: "Employee",
        colLabel: "Device",
        colState: "State",
        colLastSeen: "Last seen",
        colCreated: "Created",
        formatLastSeen: (date) => (date ? "recent" : "—"),
        formatCreated: () => "today",
        revokeLabel: "Revoke",
        reinstateLabel: "Register",
      },
      { canManage: true }
    )

    expect(parseListSurfaceRendererConfiguration(configuration).success).toBe(true)
    const trailingAction = configuration.rows[0]?.trailingAction
    expect(trailingAction?.state).toBe("ready")
    if (trailingAction?.state === "ready") {
      expect(trailingAction.descriptor?.label).toBe("Revoke")
    }
  })

  it("builds pending exception inbox with decide affordance when canDecide", () => {
    const configuration = buildRemoteCheckinPendingListSurfaceConfiguration(
      [PENDING_ROW],
      {
        empty: "Empty",
        colEmployee: "Employee",
        colEventType: "Event",
        colWhen: "When",
        colOutcome: "Detection",
        colReason: "Reason",
        formatWhen: (date) => date.toISOString(),
        outcomeLabel: (value) => value,
        decideLabel: "Decide",
      },
      { canDecide: true }
    )

    expect(parseListSurfaceRendererConfiguration(configuration).success).toBe(true)
    expect(configuration.rows[0]?.trailingAction?.state).toBe("ready")
  })

  it("builds verified history list with no trailing actions", () => {
    const configuration = buildRemoteCheckinHistoryListSurfaceConfiguration(
      [HISTORY_ROW],
      {
        empty: "Empty",
        colEmployee: "Employee",
        colEventType: "Event",
        colWhen: "When",
        colLocation: "Location",
        colAccuracy: "Accuracy",
        colGeofence: "Geofence",
        formatWhen: (date) => date.toISOString(),
      }
    )

    expect(parseListSurfaceRendererConfiguration(configuration).success).toBe(true)
    expect(configuration.rows[0]?.trailingAction).toBeUndefined()
  })
})
