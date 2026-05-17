import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { auditPanelRowSchema } from "./audit-panel.schema"

export const SCHEMA_STABILITY: SchemaStability = "experimental"

export const governedDetailTabKindSchema = z.enum([
  "overview",
  "relations",
  "referrers",
  "revisions",
  "audit",
])

export const governedDetailSectionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    description: z.string().optional(),
    hidden: z.boolean().default(false),
    orderIndex: z.number().int().nonnegative().default(0),
    /** Renderer key — resolved by `#components2/metadata` detail-section adapter. */
    rendererKey: z.string().min(1),
    rendererProps: z.unknown().optional(),
  })
  .strict()

export const governedRevisionEntrySchema = z
  .object({
    id: z.string().min(1),
    occurredAt: z.string().datetime(),
    actorLabel: z.string().min(1),
    narrative: z.string().min(1),
    verb: z.enum(["create", "update", "resolve", "deprecate"]),
    changes: z
      .array(
        z
          .object({
            field: z.string().min(1),
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .strict()
      )
      .optional(),
  })
  .strict()

/**
 * Detail-tabs data nature (ADR-0025 §2).
 *
 * `tabbed-detail` — primary entity-detail surface with overview /
 *                    relations / referrers / revisions / audit tabs.
 *                    Single-member enum reserves the discriminator for
 *                    future variants (e.g. `wizard-detail`, `viewer-only`).
 */
export const governedDetailTabsDataNatureSchema = z.enum(["tabbed-detail"])
export type GovernedDetailTabsDataNature = z.infer<
  typeof governedDetailTabsDataNatureSchema
>

export const governedDetailTabsSchema = z
  .object({
    dataNature: governedDetailTabsDataNatureSchema.default("tabbed-detail"),
    entityLabel: z.string().min(1),
    entityKind: z.string().min(1),
    entityId: z.string().min(1),
    overview: governedDetailSectionSchema,
    relations: z.array(governedDetailSectionSchema).optional(),
    referrers: z.array(governedDetailSectionSchema).optional(),
    revisions: z.array(governedRevisionEntrySchema).optional(),
    audit: z.array(auditPanelRowSchema).optional(),
    defaultTab: governedDetailTabKindSchema.default("overview"),
  })
  .strict()

export type GovernedDetailTabKind = z.infer<typeof governedDetailTabKindSchema>
export type GovernedDetailSection = z.infer<typeof governedDetailSectionSchema>
export type GovernedRevisionEntry = z.infer<typeof governedRevisionEntrySchema>
export type GovernedDetailTabsModel = z.infer<typeof governedDetailTabsSchema>
export type GovernedDetailTabsInput = z.input<typeof governedDetailTabsSchema>

export function parseGovernedDetailTabsData(raw: unknown) {
  return governedDetailTabsSchema.safeParse(raw)
}
