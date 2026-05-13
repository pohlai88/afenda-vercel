import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { pageHeaderSchema } from "./page-header.schema"

export const SCHEMA_STABILITY: SchemaStability = "beta"

export const listColumnSchema = z
  .object({
    id: z.string().min(1),
    header: z.string().min(1),
    align: z.enum(["start", "center", "end"]).optional(),
    width: z.enum(["auto", "sm", "md", "lg"]).optional(),
  })
  .strict()

export const emptyStateSchema = z
  .object({
    variant: z.enum(["muted", "cta", "forbidden", "error"]),
    title: z.string().min(1),
    description: z.string().optional(),
    cta: z
      .object({
        label: z.string().min(1),
        href: z.string().min(1),
      })
      .strict()
      .optional(),
  })
  .strict()

export const listSurfaceSchema = z
  .object({
    header: pageHeaderSchema,
    columnsId: z.string().min(1),
    rowKey: z.string().min(1),
    empty: emptyStateSchema,
    primaryAction: z
      .object({
        label: z.string().min(1),
        href: z.string().min(1).optional(),
        actionId: z.string().min(1).optional(),
        minRole: z.enum(["member", "admin", "owner"]).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()

export type ListColumn = z.infer<typeof listColumnSchema>
export type EmptyState = z.infer<typeof emptyStateSchema>
export type ListSurface = z.infer<typeof listSurfaceSchema>

export function parseEmptyStateData(raw: unknown) {
  return emptyStateSchema.safeParse(raw)
}

export function parseListSurfaceData(raw: unknown) {
  return listSurfaceSchema.safeParse(raw)
}
