import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { listColumnSchema, listSurfaceSchema } from "./list-surface.schema"

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

export const listSurfaceRendererConfigurationSchema = z
  .object({
    dataNature: listSurfaceRendererDataNatureSchema.default("table"),
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
