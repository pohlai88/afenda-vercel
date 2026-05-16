import { z } from "zod"

const skillCodeRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const createSkillFormSchema = z.object({
  orgSlug: z.string().min(1),
  code: z
    .string()
    .min(2)
    .max(64)
    .regex(skillCodeRegex, "Use lowercase kebab-case codes."),
  label: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
})

export const updateSkillFormSchema = z.object({
  orgSlug: z.string().min(1),
  skillId: z.string().uuid(),
  label: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
})

export const archiveSkillFormSchema = z.object({
  orgSlug: z.string().min(1),
  skillId: z.string().uuid(),
})

export const assignEmployeeSkillFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: z.string().uuid(),
  skillId: z.string().uuid(),
  proficiency: z.coerce.number().int().min(1).max(5),
  validityFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  validityTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  notes: z.string().max(500).optional(),
})

export const verifyEmployeeSkillFormSchema = z.object({
  orgSlug: z.string().min(1),
  employeeId: z.string().uuid(),
  skillId: z.string().uuid(),
})

export const removeEmployeeSkillFormSchema = verifyEmployeeSkillFormSchema
