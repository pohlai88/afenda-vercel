import { z } from "zod"

export const HRM_CONTRACT_TYPES = [
  "permanent",
  "fixed_term",
  "probation",
  "contractor",
  "intern",
] as const

export const HRM_PAY_FREQUENCIES = ["monthly", "bi_weekly", "weekly"] as const

export function isHrmContractType(
  value: string
): value is (typeof HRM_CONTRACT_TYPES)[number] {
  return (HRM_CONTRACT_TYPES as readonly string[]).includes(value)
}

export function isHrmPayFrequency(
  value: string
): value is (typeof HRM_PAY_FREQUENCIES)[number] {
  return (HRM_PAY_FREQUENCIES as readonly string[]).includes(value)
}

const uuid = z.string().uuid()
const optionalUuid = z.union([z.literal(""), uuid]).optional()

export const createDraftContractFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: uuid,
  contractType: z.enum(HRM_CONTRACT_TYPES),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  departmentId: optionalUuid,
  positionId: optionalUuid,
  jobGradeId: optionalUuid,
  baseSalaryAmount: z
    .union([z.literal(""), z.string().regex(/^\d+(\.\d{1,2})?$/)])
    .optional(),
  payFrequency: z.enum(HRM_PAY_FREQUENCIES).optional(),
  normalWorkingHoursPerWeek: z
    .union([z.literal(""), z.string().regex(/^\d+(\.\d{1,2})?$/)])
    .optional(),
})

export const activateContractFormSchema = z.object({
  orgSlug: z.string().min(1),
  contractId: uuid,
})

export const terminateContractFormSchema = z.object({
  orgSlug: z.string().min(1),
  contractId: uuid,
  terminationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  terminationReason: z.string().max(2000).optional(),
  terminationNoticeDays: z.coerce.number().int().min(0).max(365).optional(),
  offboardingStepKey: z.preprocess(
    (v) =>
      typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined,
    z.string().min(1).max(128).optional()
  ),
})

/** New draft version from the active contract — salary change governance (§7.8). */
export const salaryRevisionDraftFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: uuid,
  newBaseSalaryAmount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export type CreateDraftContractFormInput = z.infer<
  typeof createDraftContractFormSchema
>
export type ActivateContractFormInput = z.infer<
  typeof activateContractFormSchema
>
export type TerminateContractFormInput = z.infer<
  typeof terminateContractFormSchema
>
export type SalaryRevisionDraftFormInput = z.infer<
  typeof salaryRevisionDraftFormSchema
>
