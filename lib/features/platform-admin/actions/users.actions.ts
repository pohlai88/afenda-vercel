"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth, writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocalePlatformRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireGlobalAdminSession } from "#lib/auth"

const userIdSchema = z.string().min(1).max(255)

const setRoleSchema = z.object({
  userId: userIdSchema,
  role: z.enum(["user", "admin"]),
})

const banSchema = z.object({
  userId: userIdSchema,
  banReason: z.string().trim().max(280).optional(),
})

const unbanSchema = z.object({
  userId: userIdSchema,
})

export type PlatformAdminUserActionState =
  | { ok: true; message?: string }
  | { ok: false; error: string }
  | null

const USERS_REVALIDATE_PATTERN = toLocalePlatformRevalidatePattern("/users")

/**
 * Revalidates at **layout** scope so the operator workbench rail's
 * `users` pressure badge (Phase 2 — `getPlatformAdminRailPressureCounts`)
 * refreshes after every ban / unban / role mutation. `revalidatePath`
 * with `"layout"` scope walks the entire route hierarchy from the
 * matched segment up to the root, so the operator layout's parallel
 * pressure fetch invalidates alongside the users page itself.
 */
function revalidateOperatorUsersLayout() {
  revalidatePath(USERS_REVALIDATE_PATTERN, "layout")
}

function neonErr(e: { message?: string } | null): string {
  return e?.message?.trim() || "Request failed."
}

/**
 * Promote a user to / demote from the global `admin` role. Tier S audit:
 * `iam.user.role.update`.
 */
export async function setUserRoleAction(
  _prev: PlatformAdminUserActionState,
  formData: FormData
): Promise<PlatformAdminUserActionState> {
  const admin = await requireGlobalAdminSession()
  const parsed = setRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  })
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." }
  }

  const result = await auth.admin.setRole({
    userId: parsed.data.userId,
    role: parsed.data.role,
  })
  if (result.error) {
    return { ok: false, error: neonErr(result.error) }
  }

  await writeIamAuditEventFromNextHeaders({
    actorUserId: admin.userId,
    actorSessionId: admin.sessionId,
    organizationId: null,
    action: "iam.user.role.update",
    resourceType: "user",
    resourceId: parsed.data.userId,
    metadata: { role: parsed.data.role },
  })

  revalidateOperatorUsersLayout()
  return { ok: true, message: "Role updated." }
}

/**
 * Ban a user via Neon Auth admin API. Tier S audit: `iam.user.ban`.
 */
export async function banUserAction(
  _prev: PlatformAdminUserActionState,
  formData: FormData
): Promise<PlatformAdminUserActionState> {
  const admin = await requireGlobalAdminSession()
  const parsed = banSchema.safeParse({
    userId: formData.get("userId"),
    banReason: formData.get("banReason"),
  })
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." }
  }
  if (parsed.data.userId === admin.userId) {
    return { ok: false, error: "Cannot ban your own account." }
  }

  const result = await auth.admin.banUser({
    userId: parsed.data.userId,
    ...(parsed.data.banReason ? { banReason: parsed.data.banReason } : {}),
  })
  if (result.error) {
    return { ok: false, error: neonErr(result.error) }
  }

  await writeIamAuditEventFromNextHeaders({
    actorUserId: admin.userId,
    actorSessionId: admin.sessionId,
    organizationId: null,
    action: "iam.user.ban",
    resourceType: "user",
    resourceId: parsed.data.userId,
    metadata: parsed.data.banReason
      ? { banReason: parsed.data.banReason }
      : null,
  })

  revalidateOperatorUsersLayout()
  return { ok: true, message: "User banned." }
}

/** Unban a user. Tier S audit: `iam.user.unban`. */
export async function unbanUserAction(
  _prev: PlatformAdminUserActionState,
  formData: FormData
): Promise<PlatformAdminUserActionState> {
  const admin = await requireGlobalAdminSession()
  const parsed = unbanSchema.safeParse({
    userId: formData.get("userId"),
  })
  if (!parsed.success) {
    return { ok: false, error: "Invalid input." }
  }

  const result = await auth.admin.unbanUser({
    userId: parsed.data.userId,
  })
  if (result.error) {
    return { ok: false, error: neonErr(result.error) }
  }

  await writeIamAuditEventFromNextHeaders({
    actorUserId: admin.userId,
    actorSessionId: admin.sessionId,
    organizationId: null,
    action: "iam.user.unban",
    resourceType: "user",
    resourceId: parsed.data.userId,
  })

  revalidateOperatorUsersLayout()
  return { ok: true, message: "User unbanned." }
}
