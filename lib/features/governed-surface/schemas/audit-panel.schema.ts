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

/**
 * Audit-panel data nature (ADR-0025 §2).
 *
 * `audit-trail` — `iam_audit_event` rows rendered for human review.
 *                  Single-member enum today; reserved for future
 *                  differentiation (e.g. `change-log` vs `audit-trail`).
 */
export const auditPanelDataNatureSchema = z.enum(["audit-trail"])
export type AuditPanelDataNature = z.infer<typeof auditPanelDataNatureSchema>

export const auditPanelSchema = z
  .object({
    dataNature: auditPanelDataNatureSchema.default("audit-trail"),
    headerTitle: z.string().min(1),
    headerDescription: z.string().optional(),
    rows: z.array(auditPanelRowSchema),
  })
  .strict()

export type AuditPanelRow = z.infer<typeof auditPanelRowSchema>
export type AuditPanelModel = z.infer<typeof auditPanelSchema>
export type AuditPanelInput = z.input<typeof auditPanelSchema>

export function parseAuditPanelData(raw: unknown) {
  return auditPanelSchema.safeParse(raw)
}
