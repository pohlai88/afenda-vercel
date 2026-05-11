import { z } from "zod"

/** CSV adapter row — columns normalized by {@link parseCsv} (lower-case headers). */
export const hrmPayrollProfileImportRowSchema = z.object({
  employeeNumber: z.string().min(1).max(64),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  countryCode: z.string().min(2).max(8).optional(),
  epfNumber: z.string().max(64).optional(),
  taxIdentifierType: z.string().max(64).optional(),
  taxIdentifierNumber: z.string().max(128).optional(),
})

export type HrmPayrollProfileImportRow = z.infer<
  typeof hrmPayrollProfileImportRowSchema
>
