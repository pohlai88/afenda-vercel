import { z } from "zod"

const trimmedNonEmpty = z.string().trim().min(1)

const optionalTrimmed = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(500).optional()
)

const optionalEmail = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(320).email().optional()
)

const optionalUuid = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().uuid().optional()
)

export const createEmployeeFormSchema = z.object({
  employeeNumber: trimmedNonEmpty.max(64),
  legalName: trimmedNonEmpty.max(500),
  preferredName: optionalTrimmed,
  email: optionalEmail,
  currentDepartmentId: optionalUuid,
  currentPositionId: optionalUuid,
  currentJobGradeId: optionalUuid,
})

export const updateEmployeeFormSchema = createEmployeeFormSchema.extend({
  employeeId: z.string().uuid(),
})

export const archiveEmployeeFormSchema = z.object({
  employeeId: z.string().uuid(),
  archivedReason: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(2000).optional()
  ),
})

export type CreateEmployeeFormInput = z.infer<typeof createEmployeeFormSchema>
export type UpdateEmployeeFormInput = z.infer<typeof updateEmployeeFormSchema>
export type ArchiveEmployeeFormInput = z.infer<typeof archiveEmployeeFormSchema>
