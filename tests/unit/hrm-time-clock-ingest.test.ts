import { describe, expect, it } from "vitest"

import { timeClockManualImportAdapter } from "../../lib/features/hrm/time-attendance/time-clock-integration/data/tci-manual-import.adapter.server.ts"
import {
  parseUkgVendorPollUrl,
  parseVendorPollUrl,
  parseZebraVendorPollUrl,
} from "../../lib/features/hrm/time-attendance/time-clock-integration/data/tci-vendor-adapter.shared.ts"
import {
  parseGenericVendorPollPayload,
  parseUkgVendorPollPayload,
  parseZebraVendorPollPayload,
} from "../../lib/features/hrm/time-attendance/time-clock-integration/data/tci-vendor-payload.shared.ts"
import { TCI_VENDOR_ADAPTERS } from "../../lib/features/hrm/time-attendance/time-clock-integration/data/tci-vendor-adapters.server.ts"
import { validateTimeClockIntegrationCredentialRef } from "../../lib/features/hrm/time-attendance/time-clock-integration/data/tci-credential-validation.shared.ts"
import { upsertTimeClockDeviceFormSchema } from "../../lib/features/hrm/time-attendance/time-clock-integration/schemas/tci.schema.ts"
import {
  isDeviceConfiguredForScheduledVendorSync,
  isDeviceDueForScheduledSync,
  resolveTimeClockSyncIntervalMs,
} from "../../lib/features/hrm/time-attendance/time-clock-integration/data/tci-scheduled-sync.shared.ts"
import {
  isTimeClockPunchWithinShiftWindow,
  TCI_SHIFT_WINDOW_MS,
} from "../../lib/features/hrm/time-attendance/time-clock-integration/data/tci-punch-validation.shared.ts"
import {
  timeClockIngestBatchSchema,
  timeClockIngestPunchSchema,
  timeClockManualImportRowSchema,
} from "../../lib/features/hrm/time-attendance/time-clock-integration/schemas/tci.schema.ts"

describe("time clock ingest schemas", () => {
  it("accepts a valid single punch", () => {
    const parsed = timeClockIngestPunchSchema.safeParse({
      externalDeviceId: "TERM-1",
      clockUserId: "badge-9",
      eventType: "clock_in",
      occurredAtIso: "2026-05-20T09:00:00.000Z",
    })
    expect(parsed.success).toBe(true)
  })

  it("accepts scheduled batches with deviceId", () => {
    const parsed = timeClockIngestBatchSchema.safeParse({
      organizationId: "00000000-0000-4000-8000-000000000001",
      sourceKind: "scheduled",
      deviceId: "00000000-0000-4000-8000-000000000099",
      punches: [
        {
          externalDeviceId: "TERM-1",
          clockUserId: "badge-9",
          eventType: "clock_out",
          occurredAtIso: "2026-05-20T17:00:00.000Z",
        },
      ],
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects batches without punches", () => {
    const parsed = timeClockIngestBatchSchema.safeParse({
      organizationId: "org-1",
      punches: [],
    })
    expect(parsed.success).toBe(false)
  })
})

describe("time clock manual import adapter", () => {
  it("parses required CSV headers", () => {
    const parsed = timeClockManualImportAdapter.parseRow({
      external_device_id: "TERM-1",
      clock_user_id: "u-1",
      event_type: "clock_in",
      occurred_at_iso: "2026-05-20T09:00:00.000Z",
    })
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.payload.external_device_id).toBe("TERM-1")
    }
  })

  it("rejects invalid manual import rows", () => {
    const parsed = timeClockManualImportRowSchema.safeParse({
      external_device_id: "",
      clock_user_id: "u-1",
      event_type: "clock_in",
      occurred_at_iso: "not-a-date",
    })
    expect(parsed.success).toBe(false)
  })
})

describe("scheduled vendor sync helpers", () => {
  it("parses poll: credential URLs", () => {
    expect(
      parseVendorPollUrl("poll:https://vendor.example.com/punches.json")
    ).toBe("https://vendor.example.com/punches.json")
    expect(parseVendorPollUrl("api-key-secret")).toBeNull()
  })

  it("parses vendor:zebra: and vendor:ukg: credential URLs", () => {
    expect(
      parseZebraVendorPollUrl("vendor:zebra:https://zebra.example.com/tx")
    ).toBe("https://zebra.example.com/tx")
    expect(
      parseUkgVendorPollUrl("vendor:ukg:https://ukg.example.com/exports")
    ).toBe("https://ukg.example.com/exports")
  })

  it("registers zebra, ukg, and generic http poll adapters", () => {
    expect(TCI_VENDOR_ADAPTERS.map((a) => a.id)).toEqual([
      "zebra",
      "ukg",
      "http_poll",
    ])
  })

  it("detects poll-configured devices", () => {
    expect(
      isDeviceConfiguredForScheduledVendorSync(
        "poll:https://vendor.example.com/punches.json"
      )
    ).toBe(true)
    expect(
      isDeviceConfiguredForScheduledVendorSync(
        "vendor:zebra:https://zebra.example.com/tx"
      )
    ).toBe(true)
    expect(isDeviceConfiguredForScheduledVendorSync(null)).toBe(false)
  })

  it("validates integration credential refs", () => {
    expect(validateTimeClockIntegrationCredentialRef("")).toBeNull()
    expect(
      validateTimeClockIntegrationCredentialRef(
        "poll:https://vendor.example.com/punches.json"
      )
    ).toBeNull()
    expect(
      validateTimeClockIntegrationCredentialRef("poll:not-a-url")
    ).not.toBeNull()
    expect(validateTimeClockIntegrationCredentialRef("sk_live_test_key_12")).toBeNull()

    const parsed = upsertTimeClockDeviceFormSchema.safeParse({
      externalDeviceId: "TERM-1",
      name: "Lobby",
      deviceType: "kiosk",
      integrationCredentialRef: "poll:bad",
    })
    expect(parsed.success).toBe(false)
  })

  it("parses generic, zebra, and ukg vendor poll payloads", () => {
    expect(
      parseGenericVendorPollPayload({
        punches: [
          {
            clockUserId: "u-1",
            eventType: "clock_in",
            occurredAtIso: "2026-05-20T09:00:00.000Z",
          },
        ],
      })
    ).toHaveLength(1)

    expect(
      parseZebraVendorPollPayload({
        transactions: [
          {
            userId: "badge-1",
            punchType: "IN",
            timestamp: "2026-05-20T09:00:00.000Z",
          },
        ],
      })
    ).toHaveLength(1)

    expect(
      parseUkgVendorPollPayload(
        {
          punchExports: [
            {
              personNumber: "1001",
              punchDtm: "2026-05-20T09:00:00.000Z",
              punchType: "ClockIn",
            },
          ],
        },
        "TERM-1"
      )
    ).toHaveLength(1)
  })

  it("defaults sync interval to six hours when env is invalid", () => {
    expect(resolveTimeClockSyncIntervalMs(undefined)).toBe(360 * 60 * 1000)
    expect(resolveTimeClockSyncIntervalMs("5")).toBe(360 * 60 * 1000)
    expect(resolveTimeClockSyncIntervalMs("30")).toBe(30 * 60 * 1000)
  })

  it("skips devices polled inside the interval window", () => {
    const now = new Date("2026-05-20T12:00:00.000Z")
    const lastSyncAt = new Date(now.getTime() - 30 * 60 * 1000)
    expect(
      isDeviceDueForScheduledSync({
        lastSyncAt,
        now,
        intervalMs: 60 * 60 * 1000,
      })
    ).toBe(false)
    expect(
      isDeviceDueForScheduledSync({
        lastSyncAt: null,
        now,
        intervalMs: 60 * 60 * 1000,
      })
    ).toBe(true)
  })
})

describe("isTimeClockPunchWithinShiftWindow", () => {
  const shiftStart = new Date("2026-05-20T09:00:00.000Z")
  const shiftEnd = new Date("2026-05-20T17:00:00.000Z")

  it("accepts punches inside the padded shift window", () => {
    expect(
      isTimeClockPunchWithinShiftWindow({
        occurredAt: new Date("2026-05-20T09:30:00.000Z"),
        scheduledStartAt: shiftStart,
        scheduledEndAt: shiftEnd,
        windowMs: TCI_SHIFT_WINDOW_MS,
      })
    ).toBe(true)
  })

  it("rejects punches far outside the shift window", () => {
    expect(
      isTimeClockPunchWithinShiftWindow({
        occurredAt: new Date("2026-05-20T23:00:00.000Z"),
        scheduledStartAt: shiftStart,
        scheduledEndAt: shiftEnd,
        windowMs: TCI_SHIFT_WINDOW_MS,
      })
    ).toBe(false)
  })
})
