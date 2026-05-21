import { z } from "zod"

import { TCI_PUNCH_EVENT_TYPES } from "../schemas/tci-workflow-state.shared"
import type { TimeClockIngestPunchInput } from "../schemas/tci.schema"

const genericPunchSchema = z.object({
  clockUserId: z.string().trim().min(1),
  eventType: z.enum(TCI_PUNCH_EVENT_TYPES),
  occurredAtIso: z.string().datetime(),
  sourceRef: z.string().trim().max(200).optional(),
  rawPayloadHash: z.string().trim().max(128).optional(),
})

export const genericVendorPollPayloadSchema = z.object({
  punches: z.array(genericPunchSchema).default([]),
})

export type VendorPunchDraft = Omit<TimeClockIngestPunchInput, "externalDeviceId">

const ZEBRA_PUNCH_TYPE_MAP: Record<string, VendorPunchDraft["eventType"]> = {
  IN: "clock_in",
  OUT: "clock_out",
  BREAK_IN: "break_start",
  BREAK_OUT: "break_end",
  CLOCK_IN: "clock_in",
  CLOCK_OUT: "clock_out",
}

const UKG_PUNCH_TYPE_MAP: Record<string, VendorPunchDraft["eventType"]> = {
  ClockIn: "clock_in",
  ClockOut: "clock_out",
  BreakIn: "break_start",
  BreakOut: "break_end",
  clock_in: "clock_in",
  clock_out: "clock_out",
}

export function parseGenericVendorPollPayload(
  json: unknown
): readonly VendorPunchDraft[] {
  const parsed = genericVendorPollPayloadSchema.safeParse(json)
  if (!parsed.success) {
    throw new Error("Vendor poll response did not match the generic punch schema.")
  }
  return parsed.data.punches
}

export function parseZebraVendorPollPayload(
  json: unknown
): readonly VendorPunchDraft[] {
  const envelope = z
    .object({
      transactions: z
        .array(
          z.object({
            userId: z.string().trim().min(1),
            punchType: z.string().trim().min(1),
            timestamp: z.string().datetime(),
            sourceRef: z.string().trim().max(200).optional(),
          })
        )
        .default([]),
    })
    .safeParse(json)

  if (!envelope.success) {
    throw new Error("Zebra vendor response did not match the expected transactions schema.")
  }

  const punches: VendorPunchDraft[] = []
  for (const row of envelope.data.transactions) {
    const eventType = ZEBRA_PUNCH_TYPE_MAP[row.punchType.toUpperCase()]
    if (!eventType) continue
    punches.push({
      clockUserId: row.userId,
      eventType,
      occurredAtIso: row.timestamp,
      sourceRef: row.sourceRef,
    })
  }
  return punches
}

export function parseUkgVendorPollPayload(
  json: unknown,
  externalDeviceId: string
): readonly VendorPunchDraft[] {
  const envelope = z
    .object({
      deviceExternalId: z.string().trim().optional(),
      punchExports: z
        .array(
          z.object({
            personNumber: z.string().trim().min(1),
            punchDtm: z.string().datetime(),
            punchType: z.string().trim().min(1),
            sourceRef: z.string().trim().max(200).optional(),
          })
        )
        .default([]),
    })
    .safeParse(json)

  if (!envelope.success) {
    throw new Error("UKG vendor response did not match the expected punchExports schema.")
  }

  if (
    envelope.data.deviceExternalId &&
    envelope.data.deviceExternalId !== externalDeviceId
  ) {
    return []
  }

  const punches: VendorPunchDraft[] = []
  for (const row of envelope.data.punchExports) {
    const eventType = UKG_PUNCH_TYPE_MAP[row.punchType]
    if (!eventType) continue
    punches.push({
      clockUserId: row.personNumber,
      eventType,
      occurredAtIso: row.punchDtm,
      sourceRef: row.sourceRef,
    })
  }
  return punches
}
