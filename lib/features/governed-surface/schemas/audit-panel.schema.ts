import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

export const SCHEMA_STABILITY: SchemaStability = "beta"

export const auditPanelRowSchema = z
  .object({
    id: z.string().min(1),
    action: z.string().min(1),
    occurredAt: z.string().datetime(),
    actorLabel: z.string().min(1),
    resourceLabel: z.string().optional(),
    narrative: z.string().optional(),
  })
  .strict()

export const auditPanelSchema = z
  .object({
    headerTitle: z.string().min(1),
    headerDescription: z.string().optional(),
    rows: z.array(auditPanelRowSchema),
  })
  .strict()

export type AuditPanelRow = z.infer<typeof auditPanelRowSchema>
export type AuditPanelModel = z.infer<typeof auditPanelSchema>

export function parseAuditPanelData(raw: unknown) {
  return auditPanelSchema.safeParse(raw)
}
