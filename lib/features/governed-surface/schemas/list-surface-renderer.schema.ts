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

export const listSurfaceRendererConfigurationSchema = z
  .object({
    surface: listSurfaceSchema,
    columns: z.array(listColumnSchema).min(1),
    rows: z.array(listSurfaceRowSchema),
  })
  .strict()

export type ListSurfaceRow = z.infer<typeof listSurfaceRowSchema>
export type ListSurfaceRendererConfiguration = z.infer<
  typeof listSurfaceRendererConfigurationSchema
>

export function parseListSurfaceRendererConfiguration(raw: unknown) {
  return listSurfaceRendererConfigurationSchema.safeParse(raw)
}
