"use server"

import { revalidatePath } from "next/cache"

import { and, eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "#lib/db"
import {
  erpRole,
  erpRoleMember,
  erpRolePermission,
  tenantAuthority,
} from "#lib/db/schema"
import { neonAuthMember } from "#lib/db/schema-neon-auth"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  getErpPermissionDefinition,
  isKnownErpPermissionKey,
} from "../constants"
import type { ErpRbacActionState, TenantAuthorityRole } from "../types"
import {
  listPermissionTuplesForRoleIds,
  listRoleIdsForUser,
} from "../data/erp-rbac.queries.server"
import {
  requireTenantAuthority,
  requireTenantOwnerOrOperator,
} from "../data/erp-rbac-guards.server"
import { detectSodConflict } from "../data/sod.shared"

const idSchema = z.string().trim().min(1).max(128)
const nameSchema = z.string().trim().min(2).max(120)
const descriptionSchema = z.string().trim().max(500).optional()
const tenantAuthorityRoleSchema = z.enum([
  "tenant_owner",
  "tenant_key_admin",
  "tenant_support_admin",
])
const permissionKeySchema = z.string().trim().min(3).max(160)

function revalidateAccessAdmin() {
  revalidatePath(toLocaleOrgAdminRevalidatePattern(""), "layout")
}

async function assertOrganizationMember(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: neonAuthMember.id })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.organizationId, organizationId),
        eq(neonAuthMember.userId, userId)
      )
    )
    .limit(1)

  return Boolean(row)
}

async function upsertTenantAuthority(input: {
  organizationId: string
  userId: string
  role: TenantAuthorityRole
  actorUserId: string
}) {
  const [existing] = await db
    .select({ id: tenantAuthority.id })
    .from(tenantAuthority)
    .where(
      and(
        eq(tenantAuthority.organizationId, input.organizationId),
        eq(tenantAuthority.userId, input.userId),
        eq(tenantAuthority.role, input.role)
      )
    )
    .limit(1)

  if (existing) {
    await db
      .update(tenantAuthority)
      .set({
        status: "active",
        appointedByUserId: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(tenantAuthority.id, existing.id))
    return
  }

  await db.insert(tenantAuthority).values({
    organizationId: input.organizationId,
    userId: input.userId,
    role: input.role,
    status: "active",
    appointedByUserId: input.actorUserId,
  })
}

async function countActiveSupportAdmins(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ id: tenantAuthority.id })
    .from(tenantAuthority)
    .where(
      and(
        eq(tenantAuthority.organizationId, organizationId),
        eq(tenantAuthority.role, "tenant_support_admin"),
        eq(tenantAuthority.status, "active")
      )
    )

  return rows.length
}

export async function assignTenantAuthorityAction(
  _prev: ErpRbacActionState,
  formData: FormData
): Promise<ErpRbacActionState> {
  const targetUserId = idSchema.safeParse(formData.get("userId"))
  const role = tenantAuthorityRoleSchema.safeParse(formData.get("role"))
  if (!targetUserId.success || !role.success) {
    return { ok: false, error: "Invalid tenant authority input." }
  }

  const gate =
    role.data === "tenant_owner"
      ? await requireTenantOwnerOrOperator()
      : await requireTenantAuthority([
          "tenant_owner",
          "tenant_key_admin",
          "tenant_support_admin",
        ])

  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }

  const session = gate.session
  const isMember = await assertOrganizationMember(
    session.organizationId,
    targetUserId.data
  )
  if (!isMember) {
    return { ok: false, error: "Target user is not a member of this tenant." }
  }

  await db.transaction(async (tx) => {
    if (role.data === "tenant_owner" || role.data === "tenant_key_admin") {
      await tx
        .update(tenantAuthority)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(
          and(
            eq(tenantAuthority.organizationId, session.organizationId),
            eq(tenantAuthority.role, role.data),
            eq(tenantAuthority.status, "active")
          )
        )
    }
  })

  await upsertTenantAuthority({
    organizationId: session.organizationId,
    userId: targetUserId.data,
    role: role.data,
    actorUserId: session.userId,
  })

  revalidateAccessAdmin()
  return { ok: true, message: "Tenant authority updated." }
}

export async function revokeTenantAuthorityAction(
  _prev: ErpRbacActionState,
  formData: FormData
): Promise<ErpRbacActionState> {
  const assignmentId = idSchema.safeParse(formData.get("assignmentId"))
  if (!assignmentId.success) {
    return { ok: false, error: "Invalid authority assignment." }
  }

  const ownerGate = await requireTenantOwnerOrOperator()
  if (!ownerGate.ok) {
    return { ok: false, error: ownerGate.error }
  }

  const session = ownerGate.session
  const [assignment] = await db
    .select({
      id: tenantAuthority.id,
      role: tenantAuthority.role,
      status: tenantAuthority.status,
    })
    .from(tenantAuthority)
    .where(
      and(
        eq(tenantAuthority.id, assignmentId.data),
        eq(tenantAuthority.organizationId, session.organizationId)
      )
    )
    .limit(1)

  if (!assignment || assignment.status !== "active") {
    return { ok: false, error: "Authority assignment not found." }
  }
  if (assignment.role === "tenant_key_admin") {
    return {
      ok: false,
      error: "Assign a replacement key admin before revoking this authority.",
    }
  }
  if (assignment.role === "tenant_support_admin") {
    const activeSupportCount = await countActiveSupportAdmins(
      session.organizationId
    )
    if (activeSupportCount <= 1) {
      return {
        ok: false,
        error: "At least one support admin must remain active.",
      }
    }
  }

  await db
    .update(tenantAuthority)
    .set({ status: "revoked", updatedAt: new Date() })
    .where(eq(tenantAuthority.id, assignment.id))

  revalidateAccessAdmin()
  return { ok: true, message: "Tenant authority revoked." }
}

export async function createErpRoleAction(
  _prev: ErpRbacActionState,
  formData: FormData
): Promise<ErpRbacActionState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }

  const parsed = z
    .object({
      name: nameSchema,
      description: descriptionSchema,
    })
    .safeParse({
      name: formData.get("name"),
      description: formData.get("description") ?? undefined,
    })

  if (!parsed.success) {
    return { ok: false, error: "Role name is invalid." }
  }

  try {
    await db.insert(erpRole).values({
      organizationId: gate.session.organizationId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      createdByUserId: gate.session.userId,
      status: "active",
    })
  } catch {
    return { ok: false, error: "Could not create ERP role." }
  }

  revalidateAccessAdmin()
  return { ok: true, message: "ERP role created." }
}

export async function assignErpRoleMemberAction(
  _prev: ErpRbacActionState,
  formData: FormData
): Promise<ErpRbacActionState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }

  const roleId = idSchema.safeParse(formData.get("roleId"))
  const userId = idSchema.safeParse(formData.get("userId"))
  if (!roleId.success || !userId.success) {
    return { ok: false, error: "Invalid role membership input." }
  }

  const isMember = await assertOrganizationMember(
    gate.session.organizationId,
    userId.data
  )
  if (!isMember) {
    return { ok: false, error: "Target user is not a tenant member." }
  }

  const currentRoleIds = await listRoleIdsForUser({
    organizationId: gate.session.organizationId,
    userId: userId.data,
  })
  const tuples = await listPermissionTuplesForRoleIds({
    organizationId: gate.session.organizationId,
    roleIds: [...currentRoleIds, roleId.data],
  })
  const conflict = detectSodConflict(tuples)
  if (conflict) {
    return {
      ok: false,
      error: `SoD conflict: ${conflict.module}.${conflict.object} cannot combine ${conflict.functions.join(", ")}.`,
    }
  }

  const [existing] = await db
    .select({ id: erpRoleMember.id })
    .from(erpRoleMember)
    .where(
      and(
        eq(erpRoleMember.roleId, roleId.data),
        eq(erpRoleMember.userId, userId.data)
      )
    )
    .limit(1)

  if (existing) {
    await db
      .update(erpRoleMember)
      .set({
        status: "active",
        assignedByUserId: gate.session.userId,
        updatedAt: new Date(),
      })
      .where(eq(erpRoleMember.id, existing.id))
  } else {
    await db.insert(erpRoleMember).values({
      organizationId: gate.session.organizationId,
      roleId: roleId.data,
      userId: userId.data,
      status: "active",
      assignedByUserId: gate.session.userId,
    })
  }

  revalidateAccessAdmin()
  return { ok: true, message: "Role membership updated." }
}

export async function removeErpRoleMemberAction(
  _prev: ErpRbacActionState,
  formData: FormData
): Promise<ErpRbacActionState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }

  const membershipId = idSchema.safeParse(formData.get("membershipId"))
  if (!membershipId.success) {
    return { ok: false, error: "Invalid role membership." }
  }

  await db
    .update(erpRoleMember)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(erpRoleMember.id, membershipId.data),
        eq(erpRoleMember.organizationId, gate.session.organizationId)
      )
    )

  revalidateAccessAdmin()
  return { ok: true, message: "Role membership removed." }
}

export async function grantErpPermissionAction(
  _prev: ErpRbacActionState,
  formData: FormData
): Promise<ErpRbacActionState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }

  const roleId = idSchema.safeParse(formData.get("roleId"))
  const permissionKey = permissionKeySchema.safeParse(
    formData.get("permissionKey")
  )
  if (!roleId.success || !permissionKey.success) {
    return { ok: false, error: "Invalid permission grant input." }
  }
  if (!isKnownErpPermissionKey(permissionKey.data)) {
    return { ok: false, error: "Unknown ERP permission." }
  }

  const permission = getErpPermissionDefinition(permissionKey.data)
  if (!permission) {
    return { ok: false, error: "Permission registry mismatch." }
  }

  const roleTuples = await listPermissionTuplesForRoleIds({
    organizationId: gate.session.organizationId,
    roleIds: [roleId.data],
  })
  const roleConflict = detectSodConflict([
    ...roleTuples,
    {
      module: permission.module,
      object: permission.object,
      function: permission.function,
    },
  ])
  if (roleConflict) {
    return {
      ok: false,
      error: `SoD conflict inside role: ${roleConflict.module}.${roleConflict.object} cannot combine ${roleConflict.functions.join(", ")}.`,
    }
  }

  const members = await db
    .select({ userId: erpRoleMember.userId })
    .from(erpRoleMember)
    .where(
      and(
        eq(erpRoleMember.organizationId, gate.session.organizationId),
        eq(erpRoleMember.roleId, roleId.data),
        eq(erpRoleMember.status, "active")
      )
    )

  for (const member of members) {
    const roleIds = await listRoleIdsForUser({
      organizationId: gate.session.organizationId,
      userId: member.userId,
    })
    const tuples = await listPermissionTuplesForRoleIds({
      organizationId: gate.session.organizationId,
      roleIds,
    })
    const conflict = detectSodConflict([
      ...tuples,
      {
        module: permission.module,
        object: permission.object,
        function: permission.function,
      },
    ])
    if (conflict) {
      return {
        ok: false,
        error: `SoD conflict for assigned members on ${conflict.module}.${conflict.object}.`,
      }
    }
  }

  const [existing] = await db
    .select({ id: erpRolePermission.id })
    .from(erpRolePermission)
    .where(
      and(
        eq(erpRolePermission.roleId, roleId.data),
        eq(erpRolePermission.module, permission.module),
        eq(erpRolePermission.object, permission.object),
        eq(erpRolePermission.function, permission.function)
      )
    )
    .limit(1)

  if (existing) {
    await db
      .update(erpRolePermission)
      .set({
        status: "active",
        grantedByUserId: gate.session.userId,
        updatedAt: new Date(),
      })
      .where(eq(erpRolePermission.id, existing.id))
  } else {
    await db.insert(erpRolePermission).values({
      organizationId: gate.session.organizationId,
      roleId: roleId.data,
      module: permission.module,
      object: permission.object,
      function: permission.function,
      status: "active",
      grantedByUserId: gate.session.userId,
    })
  }

  revalidateAccessAdmin()
  return { ok: true, message: "Permission granted." }
}

export async function revokeErpPermissionAction(
  _prev: ErpRbacActionState,
  formData: FormData
): Promise<ErpRbacActionState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }

  const permissionId = idSchema.safeParse(formData.get("permissionId"))
  if (!permissionId.success) {
    return { ok: false, error: "Invalid permission grant." }
  }

  await db
    .update(erpRolePermission)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(erpRolePermission.id, permissionId.data),
        eq(erpRolePermission.organizationId, gate.session.organizationId)
      )
    )

  revalidateAccessAdmin()
  return { ok: true, message: "Permission revoked." }
}
