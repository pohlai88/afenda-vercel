/** ERP RBAC capability flags for organization structure UI (serializable across RSC → client). */
export type OrgStructureSurfaceCapabilities = {
  readonly canCreate: boolean
  readonly canUpdate: boolean
  readonly canDelete: boolean
}
