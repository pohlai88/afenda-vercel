/** ERP RBAC capability flags for HRM document vault UI (serializable across RSC → client). */
export type HrmDocumentSurfaceCapabilities = {
  readonly canSearch: boolean
  readonly canCreate: boolean
  readonly canUpdate: boolean
  readonly canAudit: boolean
}
