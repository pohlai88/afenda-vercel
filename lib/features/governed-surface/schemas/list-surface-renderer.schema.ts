import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { erpPermissionRequirementSchema } from "./erp-permission-requirement.schema"
import { listColumnSchema, listSurfaceSchema } from "./list-surface.schema"
import { listSurfaceRowTrailingActionSchema } from "./list-surface-row-trailing-action.schema"

export const SCHEMA_STABILITY: SchemaStability = "beta"

export const listSurfaceRowCellSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
])

export const listSurfaceRowSchema = z
  .object({
    id: z.string().min(1),
    cells: z.record(z.string(), listSurfaceRowCellSchema),
    rowHref: z.string().min(1).optional(),
    linkColumnId: z.string().min(1).optional(),
    /** Pattern C trailing-column action metadata (Wave C3). */
    trailingAction: listSurfaceRowTrailingActionSchema.optional(),
  })
  .strict()

/**
 * List-surface data nature (ADR-0025 §2).
 *
 * `table`           — entity-list table (default). Rows are independently
 *                     navigable records (Contacts, Employees, Requisitions).
 * `document-lines`  — document-internal line items (payslip lines, journal
 *                     lines, invoice lines). Rows do not navigate; the
 *                     surface lives inside a parent document context.
 *
 * Renderer placement: `minContainerPx: 480` — list-surface must not live in
 * a workbench rail. Use stat-card or a denser primitive in narrow regions.
 */
export const listSurfaceRendererDataNatureSchema = z.enum([
  "table",
  "document-lines",
])
export type ListSurfaceRendererDataNature = z.infer<
  typeof listSurfaceRendererDataNatureSchema
>

export const listSurfacePresentationSchema = z
  .object({
    /** `table-only` when a parent Card already owns the section header. */
    variant: z.enum(["full", "table-only"]).default("full"),
    tableDensity: z.enum(["compact", "comfortable"]).default("compact"),
  })
  .strict()

export type ListSurfacePresentation = z.infer<
  typeof listSurfacePresentationSchema
>

export const listSurfaceRendererConfigurationSchema = z
  .object({
    dataNature: listSurfaceRendererDataNatureSchema.default("table"),
    /** When set, RSC builders must gate render via `resolveGovernedErpPermissionAllowed`. */
    requiresErpPermission: erpPermissionRequirementSchema.optional(),
    presentation: listSurfacePresentationSchema.optional(),
    surface: listSurfaceSchema,
    columns: z.array(listColumnSchema).min(1),
    rows: z.array(listSurfaceRowSchema),
  })
  .strict()

export type ListSurfaceRow = z.infer<typeof listSurfaceRowSchema>
export type ListSurfaceRendererConfiguration = z.infer<
  typeof listSurfaceRendererConfigurationSchema
>
export type ListSurfaceRendererConfigurationInput = z.input<
  typeof listSurfaceRendererConfigurationSchema
>

export function parseListSurfaceRendererConfiguration(raw: unknown) {
  return listSurfaceRendererConfigurationSchema.safeParse(raw)
}
