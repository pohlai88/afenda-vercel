import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { governedActionBarConfigurationSchema } from "./action-bar.schema"
import { governedApprovalTimelineConfigurationSchema } from "./approval-timeline.schema"
import { auditPanelSchema } from "./audit-panel.schema"
import { governedChartConfigurationSchema } from "./chart.schema"
import { governedDetailTabsSchema } from "./detail-tabs.schema"
import { governedKanbanBoardConfigurationSchema } from "./kanban-board.schema"
import { emptyStateSchema } from "./list-surface.schema"
import { listSurfaceRendererConfigurationSchema } from "./list-surface-renderer.schema"
import { governedMultiStepFormConfigurationSchema } from "./multi-step-form.schema"
import { governedScorecardFormConfigurationSchema } from "./scorecard-form.schema"
import { governedSectionConfigurationSchema } from "./section.schema"
import { governedStackConfigurationSchema } from "./stack.schema"
import { statCardConfigurationSchema } from "./stat-card.schema"

export const GOVERNED_COMPONENT_SCHEMA_ID =
  "governed.component" as const

export const GOVERNED_COMPONENT_SCHEMA_STABILITY: SchemaStability = "beta"

/**
 * Canonical enumeration of every governed component type literal recognised
 * by the kernel. Builders may only emit these values; `governedComponentDiscriminatedSchema`
 * rejects anything else (see `tests/unit/governed-surface/component-registry-contract.test.tsx`).
 *
 * Order is fixed: production types first (registry-backed), then design-reserve
 * types pre-registered in `AFENDA_GOVERNED_RENDERER_CONTRACTS` but without a
 * shipped renderer file.
 */
export const governedComponentTypeSchema = z.enum([
  "governed:stat-card",
  "governed:list-surface",
  "governed:section",
  "governed:stack",
  "governed:empty",
  "governed:action-bar",
  "governed:audit-panel",
  "governed:detail-tabs",
  "governed:kanban-board",
  "governed:multi-step-form",
  "governed:scorecard-form",
  "governed:approval-timeline",
  "governed:chart",
])

export type GovernedComponentType = z.infer<typeof governedComponentTypeSchema>

/**
 * Discriminated envelope for a single governed component instance.
 *
 * - `type` is the renderer-facing discriminator (resolved through
 *   `AFENDA_GOVERNED_COMPONENT_REGISTRY` → renderer id).
 * - `serverType` is the semantic intent recorded by the builder (audit,
 *   telemetry); kept as a free-trimmed string per ADR-0011.
 * - `configuration` is the per-variant configuration schema; each variant
 *   validates strictly to its own configuration shape.
 *
 * Section/stack children remain `unknown` in their configuration schemas to
 * avoid a circular import. Recursive validation is performed at the tree
 * boundary in `GovernedComponentTree`.
 */
export const governedComponentDiscriminatedSchema = z.discriminatedUnion(
  "type",
  [
    z
      .object({
        type: z.literal("governed:stat-card"),
        serverType: z.string().trim().min(1),
        configuration: statCardConfigurationSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:list-surface"),
        serverType: z.string().trim().min(1),
        configuration: listSurfaceRendererConfigurationSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:section"),
        serverType: z.string().trim().min(1),
        configuration: governedSectionConfigurationSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:stack"),
        serverType: z.string().trim().min(1),
        configuration: governedStackConfigurationSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:empty"),
        serverType: z.string().trim().min(1),
        configuration: emptyStateSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:action-bar"),
        serverType: z.string().trim().min(1),
        configuration: governedActionBarConfigurationSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:audit-panel"),
        serverType: z.string().trim().min(1),
        configuration: auditPanelSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:detail-tabs"),
        serverType: z.string().trim().min(1),
        configuration: governedDetailTabsSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:kanban-board"),
        serverType: z.string().trim().min(1),
        configuration: governedKanbanBoardConfigurationSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:multi-step-form"),
        serverType: z.string().trim().min(1),
        configuration: governedMultiStepFormConfigurationSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:scorecard-form"),
        serverType: z.string().trim().min(1),
        configuration: governedScorecardFormConfigurationSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:approval-timeline"),
        serverType: z.string().trim().min(1),
        configuration: governedApprovalTimelineConfigurationSchema,
      })
      .strict(),
    z
      .object({
        type: z.literal("governed:chart"),
        serverType: z.string().trim().min(1),
        configuration: governedChartConfigurationSchema,
      })
      .strict(),
  ]
)

export type GovernedComponent = z.infer<
  typeof governedComponentDiscriminatedSchema
>

export function parseGovernedComponentData(raw: unknown) {
  return governedComponentDiscriminatedSchema.safeParse(raw)
}
