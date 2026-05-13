import { z } from "zod"

export const HRM_PAY_SCHEDULES = ["monthly", "bi_weekly", "weekly"] as const

const uuid = z.string().uuid()

/** FormData → optional non-empty MYR decimal (TP1 / TP3). */
function optionalFormDecimalMyr(key: string) {
  return z.preprocess((raw) => {
    if (raw === null || raw === undefined) return undefined
    const s = String(raw).trim()
    return s === "" ? undefined : s
  }, z.string().regex(/^\d+(\.\d{1,2})?$/, `${key}: invalid amount`).max(20).optional())
}

export const upsertPayrollProfileFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: uuid,
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  countryCode: z.string().min(2).max(8).optional(),
  taxResidencyCountry: z.string().max(8).optional(),
  taxIdentifierType: z.string().max(64).optional(),
  taxIdentifierNumber: z.string().max(128).optional(),
  epfNumber: z.string().max(64).optional(),
  socsoNumber: z.string().max(64).optional(),
  pcbCategory: z.string().max(32).optional(),
  pcbTp1AdditionalReliefMonthlyMyr: optionalFormDecimalMyr("pcbTp1"),
  pcbTp3AdditionalDeductionMonthlyMyr: optionalFormDecimalMyr("pcbTp3"),
  bankCode: z.string().max(32).optional(),
  bankAccountTokenized: z.string().max(512).optional(),
  bankAccountHolderName: z.string().max(256).optional(),
  paySchedule: z.enum(HRM_PAY_SCHEDULES).optional(),
  payCurrency: z.string().min(3).max(8).optional(),
  payrollGroupCode: z.string().max(64).optional(),
})

export type UpsertPayrollProfileFormInput = z.infer<
  typeof upsertPayrollProfileFormSchema
>
