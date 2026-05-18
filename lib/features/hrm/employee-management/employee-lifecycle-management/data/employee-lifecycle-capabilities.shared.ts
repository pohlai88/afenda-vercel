/** ERP RBAC capability flags for HRM onboarding / lifecycle surfaces. */
export type OnboardingSurfaceCapabilities = {
  readonly canRead: boolean
  readonly canUpdate: boolean
}

/** Employee-detail boarding task mutations (onboarding or employee update). */
export type BoardingTaskSurfaceCapabilities = {
  readonly canManage: boolean
}

/** Org lifecycle overview (readiness counters + governed overview table). */
export type LifecycleOverviewSurfaceCapabilities = {
  readonly canRead: boolean
}
