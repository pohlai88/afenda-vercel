export const ERP_FUNCTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "search",
  "audit",
  "predict",
] as const

export type ErpFunction = (typeof ERP_FUNCTIONS)[number]

export const TENANT_AUTHORITY_ROLES = [
  "tenant_owner",
  "tenant_key_admin",
  "tenant_support_admin",
] as const

export type TenantAuthorityRole = (typeof TENANT_AUTHORITY_ROLES)[number]

export const TENANT_AUTHORITY_STATUSES = ["active", "revoked"] as const

export type TenantAuthorityStatus = (typeof TENANT_AUTHORITY_STATUSES)[number]

export const ERP_ROLE_STATUSES = ["active", "archived"] as const

export type ErpRoleStatus = (typeof ERP_ROLE_STATUSES)[number]

export type ErpPermissionKey = `${string}.${string}.${ErpFunction}`

export type ErpPermissionDefinition = {
  readonly key: ErpPermissionKey
  readonly module: string
  readonly object: string
  readonly function: ErpFunction
  readonly label: string
  readonly sensitivity: "standard" | "sensitive" | "restricted"
  readonly routeUse: "page" | "action" | "both"
}

export type ErpPermissionTuple = {
  readonly module: string
  readonly object: string
  readonly function: ErpFunction
}

export type TenantAuthorityAssignmentRow = {
  readonly id: string
  readonly organizationId: string
  readonly userId: string
  readonly role: TenantAuthorityRole
  readonly status: TenantAuthorityStatus
  readonly appointedByUserId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly userName: string | null
  readonly userEmail: string
}

export type ErpRoleRow = {
  readonly id: string
  readonly organizationId: string
  readonly name: string
  readonly description: string | null
  readonly status: ErpRoleStatus
  readonly createdByUserId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type ErpRoleMemberRow = {
  readonly id: string
  readonly organizationId: string
  readonly roleId: string
  readonly userId: string
  readonly status: string
  readonly assignedByUserId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly userName: string | null
  readonly userEmail: string
}

export type ErpRolePermissionRow = {
  readonly id: string
  readonly organizationId: string
  readonly roleId: string
  readonly module: string
  readonly object: string
  readonly function: ErpFunction
  readonly status: string
  readonly grantedByUserId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type AccessMemberRow = {
  readonly memberId: string
  readonly userId: string
  readonly role: string
  readonly createdAt: Date
  readonly userName: string | null
  readonly userEmail: string
}

export type ErpRbacActionState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | null
