import "server-only"

import { APIError } from "better-auth/api"

import { auth } from "#lib/auth/config.server"
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

function apiErrorMessage(err: unknown): string {
  if (err instanceof APIError) {
    const body = err.body as { message?: string } | undefined
    if (body?.message) return body.message
    if (typeof err.message === "string" && err.message.length > 0)
      return err.message
  }
  if (err instanceof Error && err.message) return err.message
  return "Better Auth API call failed"
}

/**
 * Bulk member-invite adapter. Wraps the same Better Auth `createInvitation`
 * primitive as the single-row `inviteMemberAction`, including rate-limit
 * enforcement, so quotas apply per-row inside ingestion runs too.
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
      const result = await auth.api.createInvitation({
        body: {
          email: payload.email,
          role: payload.role,
          organizationId: ctx.organizationId,
        },
        headers: ctx.headers,
      })
      const id = invitationIdFromCreateResult(result)
      return {
        ok: true,
        resourceType: "invitation",
        resourceId: id ?? undefined,
      }
    } catch (err) {
      return {
        ok: false,
        code: err instanceof APIError ? "external_api" : "unknown",
        message: apiErrorMessage(err),
      }
    }
  },
}

const ADAPTER_REGISTRY = {
  member_invite: memberInviteAdapter,
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
