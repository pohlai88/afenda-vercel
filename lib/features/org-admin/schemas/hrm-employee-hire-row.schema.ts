import { z } from "zod"

const optionalStr = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional()
  )

/**
 * CSV adapter row for bulk employee hire.
 * Required CSV columns (lower-cased): `employee_number`, `legal_name`.
 * Optional: `preferred_name`, `email`, `department_id`, `position_id`, `grade_id`.
 */
export const hrmEmployeeHireRowSchema = z.object({
  employeeNumber: z.string().trim().min(1).max(64),
  legalName: z.string().trim().min(1).max(500),
  preferredName: optionalStr(500),
  email: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().trim().email().max(320).optional()
    )
    .optional(),
  departmentId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().uuid().optional()
    )
    .optional(),
  positionId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().uuid().optional()
    )
    .optional(),
  gradeId: z
    .preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.string().uuid().optional()
    )
    .optional(),
})

export type HrmEmployeeHireRow = z.infer<typeof hrmEmployeeHireRowSchema>
