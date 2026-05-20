import { z } from "zod"

export const HRM_OTM_APPROVER_KINDS = [
  "direct_manager",
  "manager_chain",
  "department_head",
  "hr_owner",
  "hr_pool",
  "specific_user",
] as const

export type HrmOtmApproverKind = (typeof HRM_OTM_APPROVER_KINDS)[number]

export const hrmOtmApproverKindSchema = z.enum(HRM_OTM_APPROVER_KINDS)

export type OtmApprovalRouteRowShape = {
  id: string
  label: string | null
  priority: number
  departmentId: string | null
  costCenterCode: string | null
  workLocationCode: string | null
  jobGradeId: string | null
  minAmountCents: number | null
  maxAmountCents: number | null
  requiresEligibilityException: boolean | null
  requiresPolicyException: boolean | null
  approverKind: HrmOtmApproverKind
  managerChainDepth: number | null
  targetUserId: string | null
  isActive: boolean
}
