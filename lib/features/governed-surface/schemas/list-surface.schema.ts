import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { pageHeaderSchema } from "./page-header.schema"

export const SCHEMA_STABILITY: SchemaStability = "beta"

/**
 * Tone enum shared between stat-card and list-surface badge cells. Mirrors
 * `statCardToneSchema` so a column's badge tone and a stat-card's tone use
 * the same vocabulary (no drift between numeric KPI tone and list badge
 * tone).
 */
export const listCellToneSchema = z.enum([
  "default",
  "positive",
  "attention",
  "critical",
])

/**
 * Cell-kind discriminator (governed:list-surface cells).
 *
 * - `text`     — display the raw value as-is (fallback).
 * - `link`     — render as a `<Link>` to `row.rowHref` when present.
 * - `badge`    — render as a `<Badge>` using `tone` for design-token color.
 * - `currency` — format with `Intl.NumberFormat` (currency `currency`).
 * - `date`     — format as a localized date.
 * - `datetime` — format as a localized date + time.
 *
 * Discriminated by `kind` so renderers can narrow without inspecting other
 * fields. Single source of truth for cell rendering rules.
 */
export const listCellKindSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text") }).strict(),
  z.object({ kind: z.literal("link") }).strict(),
  z
    .object({
      kind: z.literal("badge"),
      tone: listCellToneSchema.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("currency"),
      currency: z.string().trim().min(1).optional(),
    })
    .strict(),
  z.object({ kind: z.literal("date") }).strict(),
  z.object({ kind: z.literal("datetime") }).strict(),
])

export const listColumnSchema = z
  .object({
    id: z.string().min(1),
    header: z.string().min(1),
    align: z.enum(["start", "center", "end"]).optional(),
    width: z.enum(["auto", "sm", "md", "lg"]).optional(),
    cellKind: listCellKindSchema.optional(),
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
export type ListCellKind = z.infer<typeof listCellKindSchema>
export type ListCellTone = z.infer<typeof listCellToneSchema>
export type EmptyState = z.infer<typeof emptyStateSchema>
export type ListSurface = z.infer<typeof listSurfaceSchema>

export function parseEmptyStateData(raw: unknown) {
  return emptyStateSchema.safeParse(raw)
}

export function parseListSurfaceData(raw: unknown) {
  return listSurfaceSchema.safeParse(raw)
}
