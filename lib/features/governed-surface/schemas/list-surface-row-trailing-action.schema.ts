import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"
import { actionDescriptorSchema } from "./action.schema"

export const SCHEMA_STABILITY: SchemaStability = "beta"

/**
 * Serializable trailing-column action metadata (ADR-0026 Pattern C — Wave C3).
 *
 * Domain builders attach this to each `ListSurfaceRow`. RSC sections still supply
 * non-serializable UI (forms) in `trailingColumn.render`, but must honor
 * `state` and surface `disabledReason` via `GovernedTrailingActionSlot`.
 */
export const listSurfaceRowTrailingActionSchema = z
  .object({
    state: z.enum(["hidden", "disabled", "ready"]),
    disabledReason: z.string().min(1).optional(),
    descriptor: actionDescriptorSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.state === "disabled" && !value.disabledReason) {
      ctx.addIssue({
        code: "custom",
        message:
          "disabledReason is required when trailing action state is disabled",
        path: ["disabledReason"],
      })
    }
    if (value.state === "hidden" && value.disabledReason) {
      ctx.addIssue({
        code: "custom",
        message:
          "disabledReason must not be set when trailing action state is hidden",
        path: ["disabledReason"],
      })
    }
  })

export type ListSurfaceRowTrailingAction = z.infer<
  typeof listSurfaceRowTrailingActionSchema
>

export function parseListSurfaceRowTrailingAction(raw: unknown) {
  return listSurfaceRowTrailingActionSchema.safeParse(raw)
}
