import type { PlannerScopeInput } from "../types"

export function assertPlannerScope(
  scope: PlannerScopeInput
): PlannerScopeInput {
  if (scope.scopeKind === "organization" && scope.organizationId.trim()) {
    return scope
  }
  if (scope.scopeKind === "personal" && scope.ownerUserId.trim()) {
    return scope
  }
  throw new Error("Invalid planner scope")
}
