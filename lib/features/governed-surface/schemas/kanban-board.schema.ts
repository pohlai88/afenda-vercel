import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { erpPermissionRequirementSchema } from "./erp-permission-requirement.schema"
import { emptyStateSchema } from "./list-surface.schema"
import { governedSurfaceChromeSchema } from "./surface-chrome.schema"

export const GOVERNED_KANBAN_BOARD_SCHEMA_ID =
  "governed.kanban-board.configuration" as const

export const GOVERNED_KANBAN_BOARD_SCHEMA_STABILITY: SchemaStability = "beta"

/** Kanban board data nature (ADR-0025 §2). */
export const kanbanBoardDataNatureSchema = z.literal("kanban")
export type KanbanBoardDataNature = z.infer<typeof kanbanBoardDataNatureSchema>

/**
 * ERP kanban interaction posture (ADR-0026).
 *
 * - `read-only` — preview / audit; transition hints only (badges, not buttons).
 * - `footer-actions` — mutations via `renderCardFooter` (Server Actions).
 * - `drag-reorder` — column moves via HTML5 drag; domain supplies `onCardMove`
 *   (no kernel mutation). Drops gated by workflow + `availableTransitions`.
 */
export const kanbanInteractionModeSchema = z.enum([
  "read-only",
  "footer-actions",
  "drag-reorder",
])

export type KanbanInteractionMode = z.infer<typeof kanbanInteractionModeSchema>

export const kanbanBoardCopySchema = z
  .object({
    boardAriaLabel: z.string().trim().min(1),
    emptyColumn: z.string().trim().min(1),
    /** Required when `interactionMode` is `drag-reorder`. */
    dragHandleAriaLabel: z.string().trim().min(1).optional(),
    invalidTitle: z.string().trim().min(1).optional(),
    invalidDescription: z.string().trim().min(1).optional(),
  })
  .strict()

export type KanbanBoardCopy = z.infer<typeof kanbanBoardCopySchema>

export const kanbanBadgeToneSchema = z.enum([
  "default",
  "positive",
  "attention",
  "critical",
])

export const kanbanColumnSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    badgeTone: kanbanBadgeToneSchema.optional(),
  })
  .strict()

export const kanbanWorkflowTransitionSchema = z
  .object({
    id: z.string().trim().min(1),
    fromColumnId: z.string().trim().min(1),
    toColumnId: z.string().trim().min(1),
  })
  .strict()

export type KanbanWorkflowTransition = z.infer<
  typeof kanbanWorkflowTransitionSchema
>

export const kanbanWorkflowSchema = z
  .object({
    transitions: z.array(kanbanWorkflowTransitionSchema).min(1),
  })
  .strict()

export const kanbanCardTransitionAvailabilitySchema = z
  .object({
    transitionId: z.string().trim().min(1),
    state: z.enum(["hidden", "disabled", "ready"]),
    label: z.string().trim().min(1),
    disabledReason: z.string().trim().min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.state === "disabled" && !value.disabledReason) {
      ctx.addIssue({
        code: "custom",
        message:
          "disabledReason is required when transition availability state is disabled",
        path: ["disabledReason"],
      })
    }
    if (value.state === "hidden" && value.disabledReason) {
      ctx.addIssue({
        code: "custom",
        message:
          "disabledReason must not be set when transition availability state is hidden",
        path: ["disabledReason"],
      })
    }
  })

export type KanbanCardTransitionAvailability = z.infer<
  typeof kanbanCardTransitionAvailabilitySchema
>

export const kanbanCardSchema = z
  .object({
    id: z.string().trim().min(1),
    columnId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    subtitle: z.string().trim().min(1).optional(),
    badges: z.array(z.string().trim().min(1)).optional(),
    /** Server-resolved transition hints for read-only boards (no kernel buttons). */
    availableTransitions: z
      .array(kanbanCardTransitionAvailabilitySchema)
      .optional(),
  })
  .strict()

export const governedKanbanBoardConfigurationSchema = z
  .object({
    dataNature: kanbanBoardDataNatureSchema.default("kanban"),
    interactionMode: kanbanInteractionModeSchema.default("read-only"),
    requiresErpPermission: erpPermissionRequirementSchema.optional(),
    copy: kanbanBoardCopySchema,
    workflow: kanbanWorkflowSchema.optional(),
    columns: z.array(kanbanColumnSchema).min(1),
    cards: z.array(kanbanCardSchema),
    columnOrder: z.array(z.string().trim().min(1)).optional(),
    /** @deprecated Prefer `copy.emptyColumn` — retained for builder migration only. */
    emptyColumnState: emptyStateSchema.optional(),
    chrome: governedSurfaceChromeSchema.optional(),
  })
  .strict()
  .superRefine((board, ctx) => {
    const columnIds = new Set<string>()

    for (const [index, col] of board.columns.entries()) {
      if (columnIds.has(col.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Column ids must be unique.",
          path: ["columns", index, "id"],
        })
      }

      columnIds.add(col.id)
    }

    const transitionIds = new Set<string>()
    if (board.workflow) {
      for (const [index, edge] of board.workflow.transitions.entries()) {
        if (transitionIds.has(edge.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Workflow transition ids must be unique.",
            path: ["workflow", "transitions", index, "id"],
          })
        }
        transitionIds.add(edge.id)

        if (!columnIds.has(edge.fromColumnId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Workflow references unknown fromColumnId "${edge.fromColumnId}".`,
            path: ["workflow", "transitions", index, "fromColumnId"],
          })
        }
        if (!columnIds.has(edge.toColumnId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Workflow references unknown toColumnId "${edge.toColumnId}".`,
            path: ["workflow", "transitions", index, "toColumnId"],
          })
        }
      }
    }

    const cardIds = new Set<string>()

    for (const [index, card] of board.cards.entries()) {
      if (cardIds.has(card.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Card ids must be unique.",
          path: ["cards", index, "id"],
        })
      }

      cardIds.add(card.id)

      if (!columnIds.has(card.columnId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Card references unknown column "${card.columnId}".`,
          path: ["cards", index, "columnId"],
        })
      }

      if (card.availableTransitions?.length) {
        if (!board.workflow) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "workflow is required when cards declare availableTransitions.",
            path: ["workflow"],
          })
        } else {
          for (const [
            ti,
            availability,
          ] of card.availableTransitions.entries()) {
            const edge = board.workflow.transitions.find(
              (t) => t.id === availability.transitionId
            )
            if (!edge) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Unknown transitionId "${availability.transitionId}".`,
                path: [
                  "cards",
                  index,
                  "availableTransitions",
                  ti,
                  "transitionId",
                ],
              })
              continue
            }
            if (edge.fromColumnId !== card.columnId) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Transition "${availability.transitionId}" does not apply to column "${card.columnId}".`,
                path: [
                  "cards",
                  index,
                  "availableTransitions",
                  ti,
                  "transitionId",
                ],
              })
            }
          }
        }
      }

      if (
        board.interactionMode === "footer-actions" &&
        card.availableTransitions?.length
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "footer-actions boards must not declare availableTransitions on cards; use renderCardFooter for mutations.",
          path: ["cards", index, "availableTransitions"],
        })
      }

      if (board.interactionMode === "drag-reorder") {
        if (card.availableTransitions === undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              "drag-reorder boards must declare availableTransitions on every card (use [] when no moves apply).",
            path: ["cards", index, "availableTransitions"],
          })
        }
      }
    }

    if (board.interactionMode === "drag-reorder") {
      if (!board.workflow) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "drag-reorder boards require workflow.",
          path: ["workflow"],
        })
      }
      if (!board.copy.dragHandleAriaLabel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "drag-reorder boards require copy.dragHandleAriaLabel.",
          path: ["copy", "dragHandleAriaLabel"],
        })
      }
    }

    if (board.columnOrder) {
      for (const [index, colId] of board.columnOrder.entries()) {
        if (!columnIds.has(colId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `columnOrder references unknown column "${colId}".`,
            path: ["columnOrder", index],
          })
        }
      }
    }
  })

export type KanbanBadgeTone = z.infer<typeof kanbanBadgeToneSchema>
export type KanbanColumn = z.infer<typeof kanbanColumnSchema>
export type KanbanCard = z.infer<typeof kanbanCardSchema>

export type GovernedKanbanBoardConfiguration = z.infer<
  typeof governedKanbanBoardConfigurationSchema
>

export type GovernedKanbanBoardConfigurationInput = z.input<
  typeof governedKanbanBoardConfigurationSchema
>

export function parseGovernedKanbanBoardConfiguration(raw: unknown) {
  return governedKanbanBoardConfigurationSchema.safeParse(raw)
}
