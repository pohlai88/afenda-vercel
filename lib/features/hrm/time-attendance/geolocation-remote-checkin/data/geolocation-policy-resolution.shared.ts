import type { RemoteCheckinPolicyScope } from "../schemas/geolocation-workflow-state.shared"

/** Facts required to match a scoped remote check-in policy (HRM-GEO-008/009). */
export type RemoteCheckinPolicyScopeFacts = {
  readonly departmentId: string | null
  readonly positionId: string | null
  readonly employmentType: string | null
  readonly policyGroupCode: string | null
}

/** Most specific scope wins when multiple active policies match. */
export const REMOTE_CHECKIN_POLICY_SCOPE_PRIORITY: readonly RemoteCheckinPolicyScope[] =
  [
    "employee",
    "policy_group",
    "position",
    "employment_type",
    "department",
    "org",
  ]

export function remoteCheckinPolicyScopePriority(
  scopeKind: RemoteCheckinPolicyScope
): number {
  const index = REMOTE_CHECKIN_POLICY_SCOPE_PRIORITY.indexOf(scopeKind)
  return index >= 0 ? index : REMOTE_CHECKIN_POLICY_SCOPE_PRIORITY.length
}

export function remoteCheckinPolicyMatchesEmployee(input: {
  readonly scopeKind: RemoteCheckinPolicyScope
  readonly scopeRef: string | null
  readonly employeeId: string
  readonly facts: RemoteCheckinPolicyScopeFacts
}): boolean {
  if (input.scopeKind === "org") return true
  const ref = input.scopeRef?.trim()
  if (!ref) return false

  switch (input.scopeKind) {
    case "employee":
      return ref === input.employeeId
    case "department":
      return ref === input.facts.departmentId
    case "position":
      return ref === input.facts.positionId
    case "employment_type":
      return ref === input.facts.employmentType
    case "policy_group":
      return ref === input.facts.policyGroupCode
    default:
      return false
  }
}

export function pickMostSpecificRemoteCheckinPolicy<
  T extends { readonly scopeKind: RemoteCheckinPolicyScope },
>(policies: readonly T[]): T | null {
  if (policies.length === 0) return null
  return [...policies].sort(
    (a, b) =>
      remoteCheckinPolicyScopePriority(a.scopeKind) -
      remoteCheckinPolicyScopePriority(b.scopeKind)
  )[0]!
}
