import "server-only"

import { resolveFwaEligibilityEmployeeFacts } from "../../flexible-work-arrangement-tracking/data/fwa-eligibility-facts.server"

import {
  pickMostSpecificRemoteCheckinPolicy,
  remoteCheckinPolicyMatchesEmployee,
  type RemoteCheckinPolicyScopeFacts,
} from "./geolocation-policy-resolution.shared"
import {
  getActiveRemoteCheckinPolicyForOrg,
  listRemoteCheckinPoliciesForOrg,
  type RemoteCheckinPolicyRow,
} from "./geolocation.queries.server"

function toScopeFacts(
  facts: Awaited<ReturnType<typeof resolveFwaEligibilityEmployeeFacts>>
): RemoteCheckinPolicyScopeFacts {
  return {
    departmentId: facts.departmentId,
    positionId: facts.positionId,
    employmentType: facts.employmentType,
    policyGroupCode: facts.policyGroupCode,
  }
}

/**
 * Resolves the effective active policy for an employee: most specific matching
 * scoped policy, else org-wide active policy, else null (caller may fall back).
 */
export async function resolveRemoteCheckinPolicyForEmployee(input: {
  readonly organizationId: string
  readonly employeeId: string
}): Promise<RemoteCheckinPolicyRow | null> {
  const [policies, facts] = await Promise.all([
    listRemoteCheckinPoliciesForOrg(input.organizationId),
    resolveFwaEligibilityEmployeeFacts(input),
  ])

  const scopeFacts = toScopeFacts(facts)
  const active = policies.filter((row) => row.isActive)

  const scopedMatches = active.filter(
    (row) =>
      row.scopeKind !== "org" &&
      remoteCheckinPolicyMatchesEmployee({
        scopeKind: row.scopeKind,
        scopeRef: row.scopeRef,
        employeeId: input.employeeId,
        facts: scopeFacts,
      })
  )

  const specific = pickMostSpecificRemoteCheckinPolicy(scopedMatches)
  if (specific) return specific

  return (
    active.find((row) => row.scopeKind === "org") ??
    (await getActiveRemoteCheckinPolicyForOrg(input.organizationId))
  )
}
