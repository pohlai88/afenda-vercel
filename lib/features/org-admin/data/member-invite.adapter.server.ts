import "server-only"

import { auth } from "#lib/auth/neon.server"
import { assertOrgInviteRateAllowed } from "#lib/auth"

import {
  memberInviteRowSchema,
  type MemberInviteRow,
} from "../schemas/member-invite-row.schema"

import type {
  AdapterApplyCtx,
  AdapterApplyErr,
  AdapterApplyOk,
  AdapterParseErr,
  AdapterParseOk,
  OrgImportAdapter,
} from "./import-adapter.server"
import { hrmPayrollProfileImportAdapter } from "./hrm-payroll-profile-import.adapter.server"
import { hrmEmployeeHireAdapter } from "./hrm-employee-hire.adapter.server"
import { attendanceImportAdapter } from "../../hrm/data/attendance-import.adapter.server"

function invitationIdFromCreateResult(result: unknown): string | null {
  if (!result || typeof result !== "object") return null
  const o = result as Record<string, unknown>
  if (typeof o.id === "string") return o.id
  const inv = o.invitation
  if (inv && typeof inv === "object") {
    const id = (inv as { id?: string }).id
    if (typeof id === "string") return id
  }
  return null
}

function neonAuthErrorMessage(
  err: {
    message?: string
    statusText?: string
  } | null
): string {
  const m = err?.message?.trim()
  if (m) return m
  const s = err?.statusText?.trim()
  if (s) return s
  return "Neon Auth API call failed"
}

/**
 * Bulk member-invite adapter. Uses the same Neon Auth `inviteMember` primitive as
 * single-row org admin actions, including rate-limit enforcement.
 */
export const memberInviteAdapter: OrgImportAdapter<MemberInviteRow> = {
  id: "member_invite",
  requiredHeaders: ["email"],

  parseRow(
    record: Record<string, string>
  ): AdapterParseOk<MemberInviteRow> | AdapterParseErr {
    const result = memberInviteRowSchema.safeParse({
      email: record.email,
      role: record.role || undefined,
    })
    if (!result.success) {
      const issue = result.error.issues[0]
      const field = issue?.path[0]
      return {
        ok: false,
        code: "validation",
        error: issue?.message ?? "Invalid row",
        field: typeof field === "string" ? field : undefined,
      }
    }
    return { ok: true, payload: result.data }
  },

  async applyRow(
    ctx: AdapterApplyCtx,
    payload: MemberInviteRow
  ): Promise<AdapterApplyOk | AdapterApplyErr> {
    const rate = await assertOrgInviteRateAllowed({
      organizationId: ctx.organizationId,
      actorUserId: ctx.actorUserId,
    })
    if (!rate.ok) {
      return {
        ok: false,
        code: "rate_limit",
        message: rate.error,
      }
    }

    try {
      const result = await auth.organization.inviteMember({
        organizationId: ctx.organizationId,
        email: payload.email,
        role: payload.role,
      })
      if (result.error) {
        return {
          ok: false,
          code: "external_api",
          message: neonAuthErrorMessage(result.error),
        }
      }
      const id = invitationIdFromCreateResult(result.data)
      return {
        ok: true,
        resourceType: "invitation",
        resourceId: id ?? undefined,
      }
    } catch (err) {
      return {
        ok: false,
        code: "unknown",
        message:
          err instanceof Error ? err.message : neonAuthErrorMessage(null),
      }
    }
  },
}

const ADAPTER_REGISTRY = {
  member_invite: memberInviteAdapter,
  hrm_payroll_profile_import: hrmPayrollProfileImportAdapter,
  hrm_employee_hire: hrmEmployeeHireAdapter,
  hrm_attendance_import: attendanceImportAdapter,
} as const

export type RegisteredAdapterId = keyof typeof ADAPTER_REGISTRY

function isRegisteredAdapterId(id: string): id is RegisteredAdapterId {
  return Object.hasOwn(ADAPTER_REGISTRY, id)
}

/** Lookup helper — returns the typed adapter or `null`. */
export function getImportAdapter(id: string): OrgImportAdapter<unknown> | null {
  if (!isRegisteredAdapterId(id)) return null
  return ADAPTER_REGISTRY[id] as OrgImportAdapter<unknown>
}
