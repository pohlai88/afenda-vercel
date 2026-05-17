/** ERP RBAC capability flags for HRM onboarding / lifecycle surfaces. */
export type OnboardingSurfaceCapabilities = {
  readonly canRead: boolean
  readonly canUpdate: boolean
}

/** Employee-detail boarding task mutations (onboarding or employee update). */
export type BoardingTaskSurfaceCapabilities = {
  readonly canManage: boolean
}
