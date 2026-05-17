import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { actionDescriptorSchema } from "./action.schema"
import { emptyStateSchema } from "./list-surface.schema"
import { governedSurfaceChromeSchema } from "./surface-chrome.schema"

export const GOVERNED_KANBAN_BOARD_SCHEMA_ID =
  "governed.kanban-board.configuration" as const

export const GOVERNED_KANBAN_BOARD_SCHEMA_STABILITY: SchemaStability = "beta"

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

export const kanbanCardSchema = z
  .object({
    id: z.string().trim().min(1),
    columnId: z.string().trim().min(1),
    title: z.string().trim().min(1),
    subtitle: z.string().trim().min(1).optional(),
    badges: z.array(z.string().trim().min(1)).optional(),
    actions: z.array(actionDescriptorSchema).optional(),
  })
  .strict()

export const governedKanbanBoardConfigurationSchema = z
  .object({
    columns: z.array(kanbanColumnSchema).min(1),
    cards: z.array(kanbanCardSchema),
    columnOrder: z.array(z.string().trim().min(1)).optional(),
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
