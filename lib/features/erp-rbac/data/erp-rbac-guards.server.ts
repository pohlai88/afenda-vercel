import "server-only"

import { requireOrgSession } from "#lib/auth"

import type { ErpPermissionTuple, TenantAuthorityRole } from "../types"
import {
  canUseErpPermission,
  hasTenantAuthority,
  hasTenantOwner,
  isPlatformOperator,
} from "./erp-rbac.queries.server"

export async function requireTenantAuthority(
  roles: TenantAuthorityRole | readonly TenantAuthorityRole[]
): Promise<
  | {
      ok: true
      session: Awaited<ReturnType<typeof requireOrgSession>>
      organizationId: Awaited<
        ReturnType<typeof requireOrgSession>
      >["organizationId"]
      userId: Awaited<ReturnType<typeof requireOrgSession>>["userId"]
      sessionId: Awaited<ReturnType<typeof requireOrgSession>>["sessionId"]
      user: Awaited<ReturnType<typeof requireOrgSession>>["user"]
      matchedRole: TenantAuthorityRole
    }
  | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const requiredRoles = Array.isArray(roles) ? roles : [roles]
  const allowed = await hasTenantAuthority({
    organizationId: session.organizationId,
    userId: session.userId,
    roles: requiredRoles,
  })

  if (!allowed) {
    return {
      ok: false,
      error: "Tenant governance authority required.",
    }
  }

  const matchedRole = requiredRoles[0]

  return {
    ok: true,
    session,
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    user: session.user,
    matchedRole,
  }
}

export async function requireTenantOwnerOrOperator(): Promise<
  | {
      ok: true
      session: Awaited<ReturnType<typeof requireOrgSession>>
      organizationId: Awaited<
        ReturnType<typeof requireOrgSession>
      >["organizationId"]
      userId: Awaited<ReturnType<typeof requireOrgSession>>["userId"]
      sessionId: Awaited<ReturnType<typeof requireOrgSession>>["sessionId"]
      user: Awaited<ReturnType<typeof requireOrgSession>>["user"]
      mode: "tenant_owner" | "platform_operator"
    }
  | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const ownerPresent = await hasTenantOwner({
    organizationId: session.organizationId,
  })
  const tenantOwner = await hasTenantAuthority({
    organizationId: session.organizationId,
    userId: session.userId,
    roles: ["tenant_owner"],
  })

  if (tenantOwner) {
    return {
      ok: true,
      session,
      organizationId: session.organizationId,
      userId: session.userId,
      sessionId: session.sessionId,
      user: session.user,
      mode: "tenant_owner",
    }
  }

  if (!ownerPresent && isPlatformOperator(session.userId, session.user.role)) {
    return {
      ok: true,
      session,
      organizationId: session.organizationId,
      userId: session.userId,
      sessionId: session.sessionId,
      user: session.user,
      mode: "platform_operator",
    }
  }

  return {
    ok: false,
    error: "Tenant owner or platform recovery authority required.",
  }
}

export async function requireErpPermission(
  permission: ErpPermissionTuple
): Promise<
  | {
      ok: true
      session: Awaited<ReturnType<typeof requireOrgSession>>
      organizationId: Awaited<
        ReturnType<typeof requireOrgSession>
      >["organizationId"]
      userId: Awaited<ReturnType<typeof requireOrgSession>>["userId"]
      sessionId: Awaited<ReturnType<typeof requireOrgSession>>["sessionId"]
      user: Awaited<ReturnType<typeof requireOrgSession>>["user"]
    }
  | { ok: false; error: string }
> {
  const session = await requireOrgSession()
  const allowed = await canUseErpPermission({
    organizationId: session.organizationId,
    userId: session.userId,
    permission,
  })

  if (!allowed) {
    return {
      ok: false,
      error: "ERP access denied. Assign the required RBAC permission first.",
    }
  }

  return {
    ok: true,
    session,
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
    user: session.user,
  }
}
