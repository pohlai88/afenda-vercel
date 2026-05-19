import { z } from "zod"

import {
  hrmCompensationBudgetScopeTypeSchema,
  hrmCompensationCycleTypeSchema,
} from "./compensation-planning.shared"

export const createCompensationCycleFormSchema = z
  .object({
    code: z.string().trim().min(1).max(64),
    name: z.string().trim().min(1).max(200),
    cycleType: hrmCompensationCycleTypeSchema,
    effectiveDate: z.string().trim().min(1),
  })
  .strict()

export const createCompensationBudgetPoolFormSchema = z
  .object({
    cycleId: z.string().trim().min(1),
    scopeType: hrmCompensationBudgetScopeTypeSchema,
    scopeId: z.string().trim().min(1),
    allocatedAmount: z.coerce.number().finite().nonnegative(),
    currency: z.string().trim().length(3).default("MYR"),
  })
  .strict()

export type CreateCompensationCycleFormState =
  | { ok: true; cycleId: string }
  | {
      ok: false
      errors: {
        form?: string
        code?: string
        name?: string
        cycleType?: string
        effectiveDate?: string
      }
    }

export type CreateCompensationBudgetPoolFormState =
  | { ok: true; poolId: string }
  | {
      ok: false
      errors: {
        form?: string
        scopeType?: string
        scopeId?: string
        allocatedAmount?: string
      }
    }
