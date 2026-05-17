import "server-only"

import { cache } from "react"

import { and, asc, eq, inArray } from "drizzle-orm"

import { isGlobalAdminUser } from "#lib/auth"
import { db } from "#lib/db"
import {
  erpRole,
  erpRoleMember,
  erpRolePermission,
  tenantAuthority,
} from "#lib/db/schema"
import { neonAuthMember, neonAuthUser } from "#lib/db/schema-neon-auth"
import { requireOrgSession } from "#lib/auth"

import type {
  AccessMemberRow,
  ErpPermissionKey,
  ErpPermissionTuple,
  ErpRoleMemberRow,
  ErpRolePermissionRow,
  ErpRoleRow,
  TenantAuthorityAssignmentRow,
  TenantAuthorityRole,
} from "../types"
import { buildErpPermissionKey } from "../constants"

export const listEffectiveErpPermissionsForUser = cache(
  async (input: {
    organizationId: string
    userId: string
  }): Promise<readonly ErpPermissionKey[]> => {
    const rows = await db
      .selectDistinct({
        module: erpRolePermission.module,
        object: erpRolePermission.object,
        function: erpRolePermission.function,
      })
      .from(erpRolePermission)
      .innerJoin(
        erpRole,
        and(
          eq(erpRole.id, erpRolePermission.roleId),
          eq(erpRole.organizationId, input.organizationId),
          eq(erpRole.status, "active")
        )
      )
      .innerJoin(
        erpRoleMember,
        and(
          eq(erpRoleMember.roleId, erpRole.id),
          eq(erpRoleMember.organizationId, input.organizationId),
          eq(erpRoleMember.userId, input.userId),
          eq(erpRoleMember.status, "active")
        )
      )
      .where(
        and(
          eq(erpRolePermission.organizationId, input.organizationId),
          eq(erpRolePermission.status, "active")
        )
      )

    return rows.map((row) =>
      buildErpPermissionKey({
        module: row.module,
        object: row.object,
        function: row.function as ErpPermissionTuple["function"],
      })
    )
  }
)

export async function canUseErpPermission(input: {
  organizationId: string
  userId: string
  permission: ErpPermissionTuple
}): Promise<boolean> {
  const keys = await listEffectiveErpPermissionsForUser({
    organizationId: input.organizationId,
    userId: input.userId,
  })
  return keys.includes(buildErpPermissionKey(input.permission))
}

export async function canUseErpPermissionForCurrentOrg(
  permission: ErpPermissionTuple
): Promise<boolean> {
  const session = await requireOrgSession()
  return canUseErpPermission({
    organizationId: session.organizationId,
    userId: session.userId,
    permission,
  })
}

export async function listUserIdsWithErpPermission(input: {
  organizationId: string
  permission: ErpPermissionTuple
}): Promise<readonly string[]> {
  const rows = await db
    .selectDistinct({ userId: erpRoleMember.userId })
    .from(erpRoleMember)
    .innerJoin(
      erpRole,
      and(
        eq(erpRole.id, erpRoleMember.roleId),
        eq(erpRole.organizationId, input.organizationId),
        eq(erpRole.status, "active")
      )
    )
    .innerJoin(
      erpRolePermission,
      and(
        eq(erpRolePermission.roleId, erpRole.id),
        eq(erpRolePermission.organizationId, input.organizationId),
        eq(erpRolePermission.module, input.permission.module),
        eq(erpRolePermission.object, input.permission.object),
        eq(erpRolePermission.function, input.permission.function),
        eq(erpRolePermission.status, "active")
      )
    )
    .where(
      and(
        eq(erpRoleMember.organizationId, input.organizationId),
        eq(erpRoleMember.status, "active")
      )
    )
    .orderBy(asc(erpRoleMember.userId))

  return rows.map((row) => row.userId)
}

export async function listTenantAuthorityAssignments(input: {
  organizationId: string
}): Promise<readonly TenantAuthorityAssignmentRow[]> {
  const rows = await db
    .select({
      id: tenantAuthority.id,
      organizationId: tenantAuthority.organizationId,
      userId: tenantAuthority.userId,
      role: tenantAuthority.role,
      status: tenantAuthority.status,
      appointedByUserId: tenantAuthority.appointedByUserId,
      createdAt: tenantAuthority.createdAt,
      updatedAt: tenantAuthority.updatedAt,
      userName: neonAuthUser.name,
      userEmail: neonAuthUser.email,
    })
    .from(tenantAuthority)
    .innerJoin(neonAuthUser, eq(neonAuthUser.id, tenantAuthority.userId))
    .where(eq(tenantAuthority.organizationId, input.organizationId))
    .orderBy(asc(tenantAuthority.role), asc(neonAuthUser.email))

  return rows as readonly TenantAuthorityAssignmentRow[]
}

export async function listAccessMembersForOrganization(input: {
  organizationId: string
}): Promise<readonly AccessMemberRow[]> {
  const rows = await db
    .select({
      memberId: neonAuthMember.id,
      userId: neonAuthMember.userId,
      role: neonAuthMember.role,
      createdAt: neonAuthMember.createdAt,
      userName: neonAuthUser.name,
      userEmail: neonAuthUser.email,
    })
    .from(neonAuthMember)
    .innerJoin(neonAuthUser, eq(neonAuthUser.id, neonAuthMember.userId))
    .where(eq(neonAuthMember.organizationId, input.organizationId))
    .orderBy(asc(neonAuthUser.email))

  return rows as readonly AccessMemberRow[]
}

export async function listErpRoles(input: {
  organizationId: string
}): Promise<readonly ErpRoleRow[]> {
  const rows = await db
    .select({
      id: erpRole.id,
      organizationId: erpRole.organizationId,
      name: erpRole.name,
      description: erpRole.description,
      status: erpRole.status,
      createdByUserId: erpRole.createdByUserId,
      createdAt: erpRole.createdAt,
      updatedAt: erpRole.updatedAt,
    })
    .from(erpRole)
    .where(eq(erpRole.organizationId, input.organizationId))
    .orderBy(asc(erpRole.name))

  return rows as readonly ErpRoleRow[]
}

export async function listErpRoleMembers(input: {
  organizationId: string
}): Promise<readonly ErpRoleMemberRow[]> {
  const rows = await db
    .select({
      id: erpRoleMember.id,
      organizationId: erpRoleMember.organizationId,
      roleId: erpRoleMember.roleId,
      userId: erpRoleMember.userId,
      status: erpRoleMember.status,
      assignedByUserId: erpRoleMember.assignedByUserId,
      createdAt: erpRoleMember.createdAt,
      updatedAt: erpRoleMember.updatedAt,
      userName: neonAuthUser.name,
      userEmail: neonAuthUser.email,
    })
    .from(erpRoleMember)
    .innerJoin(neonAuthUser, eq(neonAuthUser.id, erpRoleMember.userId))
    .where(eq(erpRoleMember.organizationId, input.organizationId))
    .orderBy(asc(erpRoleMember.roleId), asc(neonAuthUser.email))

  return rows as readonly ErpRoleMemberRow[]
}

export async function listErpRolePermissions(input: {
  organizationId: string
}): Promise<readonly ErpRolePermissionRow[]> {
  const rows = await db
    .select({
      id: erpRolePermission.id,
      organizationId: erpRolePermission.organizationId,
      roleId: erpRolePermission.roleId,
      module: erpRolePermission.module,
      object: erpRolePermission.object,
      function: erpRolePermission.function,
      status: erpRolePermission.status,
      grantedByUserId: erpRolePermission.grantedByUserId,
      createdAt: erpRolePermission.createdAt,
      updatedAt: erpRolePermission.updatedAt,
    })
    .from(erpRolePermission)
    .where(eq(erpRolePermission.organizationId, input.organizationId))
    .orderBy(
      asc(erpRolePermission.roleId),
      asc(erpRolePermission.module),
      asc(erpRolePermission.object),
      asc(erpRolePermission.function)
    )

  return rows as readonly ErpRolePermissionRow[]
}

export async function listTenantAuthoritiesForUser(input: {
  organizationId: string
  userId: string
}): Promise<readonly TenantAuthorityRole[]> {
  const rows = await db
    .select({ role: tenantAuthority.role })
    .from(tenantAuthority)
    .where(
      and(
        eq(tenantAuthority.organizationId, input.organizationId),
        eq(tenantAuthority.userId, input.userId),
        eq(tenantAuthority.status, "active")
      )
    )

  return rows.map((row) => row.role as TenantAuthorityRole)
}

export async function hasTenantAuthority(input: {
  organizationId: string
  userId: string
  roles: readonly TenantAuthorityRole[]
}): Promise<boolean> {
  const roles = await listTenantAuthoritiesForUser({
    organizationId: input.organizationId,
    userId: input.userId,
  })
  return roles.some((role) => input.roles.includes(role))
}

export async function hasTenantOwner(input: {
  organizationId: string
}): Promise<boolean> {
  const [row] = await db
    .select({ id: tenantAuthority.id })
    .from(tenantAuthority)
    .where(
      and(
        eq(tenantAuthority.organizationId, input.organizationId),
        eq(tenantAuthority.role, "tenant_owner"),
        eq(tenantAuthority.status, "active")
      )
    )
    .limit(1)

  return Boolean(row)
}

export function isPlatformOperator(
  userId: string,
  userRole: string | null | undefined
): boolean {
  const roles = String(userRole ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)

  if (roles.includes("platform_operator")) return true
  return isGlobalAdminUser(userId, userRole)
}

export async function listPermissionTuplesForRoleIds(input: {
  organizationId: string
  roleIds: readonly string[]
}): Promise<readonly ErpPermissionTuple[]> {
  if (input.roleIds.length === 0) return []

  const rows = await db
    .select({
      module: erpRolePermission.module,
      object: erpRolePermission.object,
      function: erpRolePermission.function,
    })
    .from(erpRolePermission)
    .where(
      and(
        eq(erpRolePermission.organizationId, input.organizationId),
        eq(erpRolePermission.status, "active"),
        inArray(erpRolePermission.roleId, [...input.roleIds])
      )
    )

  return rows as readonly ErpPermissionTuple[]
}

export async function listRoleIdsForUser(input: {
  organizationId: string
  userId: string
}): Promise<readonly string[]> {
  const rows = await db
    .select({ roleId: erpRoleMember.roleId })
    .from(erpRoleMember)
    .where(
      and(
        eq(erpRoleMember.organizationId, input.organizationId),
        eq(erpRoleMember.userId, input.userId),
        eq(erpRoleMember.status, "active")
      )
    )

  return rows.map((row) => row.roleId)
}
