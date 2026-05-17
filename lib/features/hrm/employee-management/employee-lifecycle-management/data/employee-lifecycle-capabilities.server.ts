import "server-only"

import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import type {
  BoardingTaskSurfaceCapabilities,
  OnboardingSurfaceCapabilities,
} from "./employee-lifecycle-capabilities.shared"

export type {
  BoardingTaskSurfaceCapabilities,
  OnboardingSurfaceCapabilities,
} from "./employee-lifecycle-capabilities.shared"

/** ERP RBAC flags for the org onboarding checklist surface. */
export async function resolveOnboardingSurfaceCapabilities(): Promise<OnboardingSurfaceCapabilities> {
  const [canRead, canUpdate] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "onboarding",
      function: "read",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "onboarding",
      function: "update",
    }),
  ])

  return { canRead, canUpdate }
}

/** True when the actor may transition boarding tasks on the employee detail surface. */
export async function resolveBoardingTaskSurfaceCapabilities(): Promise<BoardingTaskSurfaceCapabilities> {
  const [canOnboarding, canEmployee] = await Promise.all([
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "onboarding",
      function: "update",
    }),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "employee",
      function: "update",
    }),
  ])

  return { canManage: canOnboarding || canEmployee }
}
