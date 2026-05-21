import "server-only"

import type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
  AdapterParseErr,
  AdapterParseOk,
  OrgImportAdapter,
} from "#features/org-admin/server"

import {
  timeClockManualImportRowSchema,
  type TimeClockManualImportRow,
} from "../schemas/tci.schema"
import { persistTimeClockPunch } from "./tci-punch-commands.server"
import { resolveTimeClockIngestContext } from "./tci-validation.server"

/**
 * Org import adapter for manual time-clock punch CSV (HRM-TCI-029).
 *
 * Required headers: `external_device_id`, `clock_user_id`, `event_type`, `occurred_at_iso`
 * Optional: `source_ref`
 *
 * Each row routes through {@link persistTimeClockPunch} — the sole `source: device` writer.
 */
export const timeClockManualImportAdapter: OrgImportAdapter<TimeClockManualImportRow> =
  {
    id: "hrm_time_clock_import",

    requiredHeaders: [
      "external_device_id",
      "clock_user_id",
      "event_type",
      "occurred_at_iso",
    ],

    parseRow(
      record: Record<string, string>
    ): AdapterParseOk<TimeClockManualImportRow> | AdapterParseErr {
      const result = timeClockManualImportRowSchema.safeParse(record)
      if (!result.success) {
        const issues = result.error.issues
        const first = issues[0]
        return {
          ok: false,
          error: first?.message ?? "Invalid time clock row",
          field: first?.path[0] as string | undefined,
          code: "validation",
        }
      }
      return { ok: true, payload: result.data }
    },

    async applyRow(
      ctx: AdapterApplyCtx,
      payload: TimeClockManualImportRow
    ): Promise<AdapterApplyOk | AdapterApplyErr> {
      const punch = {
        externalDeviceId: payload.external_device_id,
        clockUserId: payload.clock_user_id,
        eventType: payload.event_type,
        occurredAtIso: payload.occurred_at_iso,
        sourceRef: payload.source_ref,
      }

      const resolved = await resolveTimeClockIngestContext({
        organizationId: ctx.organizationId,
        punch,
      })
      if (!resolved?.employeeId) {
        return {
          ok: false,
          code: "validation",
          message: resolved
            ? "No active employee mapping for this device and clock user."
            : "Unknown or inactive device.",
        }
      }

      const outcome = await persistTimeClockPunch({
        ctx: {
          organizationId: ctx.organizationId,
          userId: ctx.actorUserId,
          sessionId: null,
        },
        deviceId: resolved.device.id,
        employeeId: resolved.employeeId,
        punch,
        options: { recordExceptionOnReject: true },
      })

      if (outcome.status === "accepted") {
        return {
          ok: true,
          resourceType: "hrm_attendance_event",
          resourceId: outcome.eventId,
        }
      }
      if (outcome.status === "duplicate") {
        return {
          ok: false,
          code: "duplicate",
          message: "Duplicate punch row.",
        }
      }

      return {
        ok: false,
        code: "validation",
        message: outcome.message ?? "Punch rejected.",
      }
    },
  }
