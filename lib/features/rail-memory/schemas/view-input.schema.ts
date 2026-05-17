import { z } from "zod"

import { WORKBENCH_IDS } from "../constants"

/**
 * Server-side trust boundary for save / update / delete view Server
 * Actions. Same drift-prevention pattern as `pin-input.schema.ts`:
 * the kernel rail schema (`appShellPrimaryLeftRailViewSchema`) describes what
 * the rail can render; this file describes what the writer accepts.
 */

const workbenchIdSchema = z.enum(WORKBENCH_IDS)

const labelSchema = z.string().trim().min(1).max(160)
const hrefSchema = z.string().trim().min(1).max(2048)
const idSchema = z.string().trim().min(1).max(128)
const iconSchema = z.string().trim().min(1).max(64).optional()

export const saveViewInputSchema = z
  .object({
    workbenchId: workbenchIdSchema,
    label: labelSchema,
    href: hrefSchema,
    icon: iconSchema,
  })
  .strict()

export type SaveViewInput = z.infer<typeof saveViewInputSchema>

export const deleteViewInputSchema = z
  .object({
    viewId: idSchema,
  })
  .strict()

export type DeleteViewInput = z.infer<typeof deleteViewInputSchema>

/**
 * Update accepts a partial — at least one of label / href / icon must
 * be present. The empty-update case is rejected at parse time so the
 * action never writes a no-op (which would still emit an audit row
 * and revalidate the rail unnecessarily).
 *
 * `icon: null` is the explicit "clear icon" sentinel; `undefined`
 * means "preserve current value." Tri-state semantics match
 * `updateComplianceSubmissionStateMutation` — same drift-prevention
 * doctrine for partial updates.
 */
export const updateViewInputSchema = z
  .object({
    viewId: idSchema,
    label: labelSchema.optional(),
    href: hrefSchema.optional(),
    icon: z.union([iconSchema, z.null()]).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.label !== undefined ||
      input.href !== undefined ||
      input.icon !== undefined,
    { message: "Update requires at least one of: label, href, icon." }
  )

export type UpdateViewInput = z.infer<typeof updateViewInputSchema>
