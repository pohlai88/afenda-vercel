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

/** JSON body for `POST /api/erp/hrm/import` on success (200). */
export const hrmImportDryRunSuccessResponseSchema = z.object({
  ok: z.literal(true),
  sessionId: z.string().min(1),
  rowCount: z.number().int().nonnegative(),
  errors: z.array(
    z.object({
      line: z.number().int().nonnegative(),
      message: z.string(),
    })
  ),
})

export type HrmImportDryRunSuccessResponse = z.infer<
  typeof hrmImportDryRunSuccessResponseSchema
>

export const hrmImportDryRunErrorResponseSchema = z.object({
  error: z.string(),
})

export function parseHrmImportDryRunErrorMessage(
  body: unknown,
  fallback: string
): string {
  const parsed = hrmImportDryRunErrorResponseSchema.safeParse(body)
  return parsed.success ? parsed.data.error : fallback
}

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
