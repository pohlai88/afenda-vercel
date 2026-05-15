import "server-only"

import { createHash } from "crypto"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmAttendanceEvent } from "#lib/db/schema"
import type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
  AdapterParseErr,
  AdapterParseOk,
  OrgImportAdapter,
} from "#features/org-admin/server"

import { regenerateAttendanceDayFromEvents } from "./attendance-aggregator.server"
import {
  attendanceCsvRowSchema,
  type AttendanceCsvRow,
} from "../schemas/attendance-event.schema"

/**
 * Org import adapter for bulk attendance event CSV ingestion.
 *
 * Required CSV headers: `employee_id`, `event_type`, `occurred_at`
 * Optional: `correction_of_event_id`, `correction_reason`, `device_id`
 *
 * Each CSV row creates one `hrm_attendance_event`.
 * After each applied row the corresponding `hrm_attendance_day` is regenerated.
 */
export const attendanceImportAdapter: OrgImportAdapter<AttendanceCsvRow> = {
  id: "hrm_attendance_import",

  requiredHeaders: ["employee_id", "event_type", "occurred_at"],

  parseRow(
    record: Record<string, string>
  ): AdapterParseOk<AttendanceCsvRow> | AdapterParseErr {
    const result = attendanceCsvRowSchema.safeParse(record)
    if (!result.success) {
      const issues = result.error.issues
      const first = issues[0]
      return {
        ok: false,
        error: first?.message ?? "Invalid attendance row",
        field: first?.path[0] as string | undefined,
        code: "validation",
      }
    }
    return { ok: true, payload: result.data }
  },

  async applyRow(
    ctx: AdapterApplyCtx,
    payload: AttendanceCsvRow
  ): Promise<AdapterApplyOk | AdapterApplyErr> {
    const { organizationId, actorUserId } = ctx

    const occurredDate = new Date(payload.occurred_at)
    const attendanceDate = occurredDate.toISOString().slice(0, 10)

    const rawPayloadHash = createHash("sha256")
      .update(
        JSON.stringify({
          employeeId: payload.employee_id,
          eventType: payload.event_type,
          occurredAt: payload.occurred_at,
          correctionOfEventId: payload.correction_of_event_id ?? null,
        })
      )
      .digest("hex")

    const eventId = crypto.randomUUID()

    const existingRows = await db
      .select({ id: hrmAttendanceEvent.id })
      .from(hrmAttendanceEvent)
      .where(
        and(
          eq(hrmAttendanceEvent.organizationId, organizationId),
          eq(hrmAttendanceEvent.rawPayloadHash, rawPayloadHash)
        )
      )
      .limit(1)

    if (existingRows.length > 0) {
      return { ok: false, code: "duplicate", message: "Duplicate event row" }
    }

    try {
      await db.insert(hrmAttendanceEvent).values({
        id: eventId,
        organizationId,
        employeeId: payload.employee_id,
        eventType: payload.event_type,
        occurredAt: occurredDate,
        source: "csv_import",
        correctionOfEventId: payload.correction_of_event_id ?? null,
        correctionReason: payload.correction_reason ?? null,
        deviceId: payload.device_id ?? null,
        rawPayloadHash,
        createdByUserId: actorUserId,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "DB insert failed"
      // Detect duplicate event (same hash already ingested)
      if (msg.includes("unique") || msg.includes("duplicate")) {
        return { ok: false, code: "duplicate", message: "Duplicate event row" }
      }
      return { ok: false, code: "unknown", message: msg }
    }

    // Regenerate day aggregate — idempotent, silently skips if checksum unchanged
    await regenerateAttendanceDayFromEvents({
      organizationId,
      employeeId: payload.employee_id,
      attendanceDate,
      actorUserId,
    })

    return {
      ok: true,
      resourceType: "hrm_attendance_event",
      resourceId: eventId,
    }
  },
}
