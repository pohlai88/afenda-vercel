import { z } from "zod"

const codeSchema = z
  .string()
  .trim()
  .min(1, "Code is required.")
  .max(64, "Code must be at most 64 characters.")
  .regex(
    /^[A-Za-z0-9._-]+$/,
    "Code may only contain letters, digits, dot, underscore, and hyphen."
  )

const nameSchema = z.string().trim().min(1, "Name is required.").max(256)

export const createDepartmentFormSchema = z.object({
  orgSlug: z.string().min(1),
  code: codeSchema,
  name: nameSchema,
  parentDepartmentId: z
    .union([z.literal(""), z.string().uuid()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
})

export const archiveDepartmentFormSchema = z.object({
  orgSlug: z.string().min(1),
  departmentId: z.string().uuid(),
})

export const createJobGradeFormSchema = z.object({
  orgSlug: z.string().min(1),
  code: codeSchema,
  name: nameSchema,
})

export const archiveJobGradeFormSchema = z.object({
  orgSlug: z.string().min(1),
  gradeId: z.string().uuid(),
})

export const createPositionFormSchema = z.object({
  orgSlug: z.string().min(1),
  code: codeSchema,
  title: nameSchema,
  departmentId: z.string().uuid(),
  defaultGradeId: z
    .union([z.literal(""), z.string().uuid()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
})

export const archivePositionFormSchema = z.object({
  orgSlug: z.string().min(1),
  positionId: z.string().uuid(),
})
