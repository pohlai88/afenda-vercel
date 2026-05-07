"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { auth, writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { toLocaleRoutePattern } from "#lib/i18n/locales.shared"
import { requireGlobalAdminSession } from "#lib/tenant"

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

const USERS_REVALIDATE_PATTERN = toLocaleRoutePattern("/admin/users")

/**
 * Promote a user to / demote from the global `admin` role. Tier S audit:
 * `iam.user.role.update`. Caller must be a global admin (verified twice —
 * once here, once by Better Auth's `setRole` endpoint).
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

  try {
    await auth.api.setRole({
      body: { userId: parsed.data.userId, role: parsed.data.role },
      headers: await headers(),
    })
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Failed to update user role.",
    }
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

  revalidatePath(USERS_REVALIDATE_PATTERN, "page")
  return { ok: true, message: "Role updated." }
}

/**
 * Ban a user via Better Auth's admin plugin. Tier S audit:
 * `iam.user.ban`. Optional `banReason` is captured in audit metadata only
 * when present.
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

  try {
    await auth.api.banUser({
      body: {
        userId: parsed.data.userId,
        ...(parsed.data.banReason ? { banReason: parsed.data.banReason } : {}),
      },
      headers: await headers(),
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to ban user.",
    }
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

  revalidatePath(USERS_REVALIDATE_PATTERN, "page")
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

  try {
    await auth.api.unbanUser({
      body: { userId: parsed.data.userId },
      headers: await headers(),
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to unban user.",
    }
  }

  await writeIamAuditEventFromNextHeaders({
    actorUserId: admin.userId,
    actorSessionId: admin.sessionId,
    organizationId: null,
    action: "iam.user.unban",
    resourceType: "user",
    resourceId: parsed.data.userId,
  })

  revalidatePath(USERS_REVALIDATE_PATTERN, "page")
  return { ok: true, message: "User unbanned." }
}
