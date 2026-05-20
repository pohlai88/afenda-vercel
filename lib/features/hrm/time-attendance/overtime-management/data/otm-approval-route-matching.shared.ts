import type { OtmApprovalRouteRowShape } from "../schemas/otm-approval-route.shared"

export type OtmApprovalRoutingContext = {
  departmentId: string | null
  jobGradeId: string | null
  workLocationCode: string | null
  costCenterCode: string | null
  estimatedAmountCents: number | null
  hasEligibilityException: boolean
  hasPolicyException: boolean
}

export function otmApprovalRouteMatchesContext(
  rule: Pick<
    OtmApprovalRouteRowShape,
    | "departmentId"
    | "costCenterCode"
    | "workLocationCode"
    | "jobGradeId"
    | "minAmountCents"
    | "maxAmountCents"
    | "requiresEligibilityException"
    | "requiresPolicyException"
  >,
  context: OtmApprovalRoutingContext
): boolean {
  if (rule.departmentId && rule.departmentId !== context.departmentId) {
    return false
  }
  if (
    rule.costCenterCode &&
    rule.costCenterCode !== context.costCenterCode
  ) {
    return false
  }
  if (
    rule.workLocationCode &&
    rule.workLocationCode !== context.workLocationCode
  ) {
    return false
  }
  if (rule.jobGradeId && rule.jobGradeId !== context.jobGradeId) {
    return false
  }

  if (rule.requiresEligibilityException === true && !context.hasEligibilityException) {
    return false
  }
  if (rule.requiresPolicyException === true && !context.hasPolicyException) {
    return false
  }

  if (rule.minAmountCents != null) {
    if (
      context.estimatedAmountCents == null ||
      context.estimatedAmountCents < rule.minAmountCents
    ) {
      return false
    }
  }
  if (rule.maxAmountCents != null) {
    if (
      context.estimatedAmountCents == null ||
      context.estimatedAmountCents > rule.maxAmountCents
    ) {
      return false
    }
  }

  return true
}

export function pickFirstMatchingOtmApprovalRoute<
  T extends OtmApprovalRouteRowShape,
>(rules: readonly T[], context: OtmApprovalRoutingContext): T | null {
  const ordered = [...rules].sort((a, b) => a.priority - b.priority)
  for (const rule of ordered) {
    if (!rule.isActive) continue
    if (otmApprovalRouteMatchesContext(rule, context)) return rule
  }
  return null
}
