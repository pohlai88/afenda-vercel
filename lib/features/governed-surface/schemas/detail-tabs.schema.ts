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
    /** Renderer key — resolved by `detail-section-render-registry` (future component registry). */
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

export const governedDetailTabsSchema = z
  .object({
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
