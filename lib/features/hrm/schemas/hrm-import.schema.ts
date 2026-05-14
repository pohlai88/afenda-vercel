import { z } from "zod"

export const HRM_IMPORT_TYPES = ["employees", "attendance", "payroll"] as const
export type HrmImportType = (typeof HRM_IMPORT_TYPES)[number]

export const hrmImportTypeSchema = z.enum(HRM_IMPORT_TYPES)

export const hrmImportSessionStatusSchema = z.enum([
  "pending",
  "dry_run",
  "committed",
  "rolled_back",
])

/** Stored on `hrm_import_session.rollbackJson` after dry-run (and extended after commit). */
export const hrmImportRollbackJsonSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("hrm_import_placeholder"),
    importType: z.string(),
    contentSha256: z.string(),
  }),
  z.object({
    kind: z.literal("hrm_import_v1"),
    importType: z.literal("employees"),
    contentSha256: z.string(),
    sourceCsv: z.string(),
    appliedEmployeeIds: z.array(z.string().uuid()).optional(),
    appliedAt: z.string().optional(),
    appliedByUserId: z.string().optional(),
  }),
])

export type HrmImportRollbackJson = z.infer<typeof hrmImportRollbackJsonSchema>
