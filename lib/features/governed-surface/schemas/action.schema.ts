import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

export const SCHEMA_STABILITY: SchemaStability = "beta"

/**
 * Intent widens ERP semantics; renderers may map non-destructive intents to the
 * same chrome until telemetry / escalation branches land.
 *
 * RESERVED (Phase 10+ — see ADR-0011):
 * - `evidence`: none | available | required | incomplete
 * - `owner`: hrm | finance | iam | platform
 * - `workflowId`: Workflow DevKit handle
 */
export const actionDescriptorSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    intent: z
      .enum(["default", "destructive", "approval", "financial", "compliance"])
      .default("default"),
    minRole: z.enum(["member", "admin", "owner"]).optional(),
    requiresStepUp: z.boolean().optional(),
    confirm: z
      .object({
        title: z.string().min(1),
        description: z.string().optional(),
        confirmLabel: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict()

export type ActionDescriptor = z.infer<typeof actionDescriptorSchema>

export function parseActionDescriptorData(raw: unknown) {
  return actionDescriptorSchema.safeParse(raw)
}
