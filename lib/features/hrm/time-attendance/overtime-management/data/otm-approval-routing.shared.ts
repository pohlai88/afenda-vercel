import {
  type OtmApprovalStage,
  parseOtmApprovalSnapshot,
} from "./otm-approval-snapshot.shared"
import type { OtmPolicyRow } from "./otm-policy.shared"

export const OTM_MANAGER_CHAIN_MAX_DEPTH_LIMIT = 5

export function resolveInitialOtmApprovalStage(input: {
  policy: Pick<OtmPolicyRow, "requireHrSecondApproval">
  managerApproverUserId: string | null
}): OtmApprovalStage {
  if (!input.policy.requireHrSecondApproval) return "hr"
  return input.managerApproverUserId ? "manager" : "hr"
}

export function readOtmApprovalStage(
  snapshotRaw: unknown,
  policy: Pick<OtmPolicyRow, "requireHrSecondApproval">
): OtmApprovalStage {
  if (!policy.requireHrSecondApproval) return "hr"

  const parsed = parseOtmApprovalSnapshot(snapshotRaw)
  if (parsed?.approvalStage === "hr") return "hr"

  if (snapshotRaw && typeof snapshotRaw === "object") {
    const stage = (snapshotRaw as Record<string, unknown>).approvalStage
    if (stage === "hr") return "hr"
  }

  return "manager"
}

export function managerChainDepthClamped(maxDepth: number): number {
  return Math.min(
    Math.max(maxDepth, 1),
    OTM_MANAGER_CHAIN_MAX_DEPTH_LIMIT
  )
}
