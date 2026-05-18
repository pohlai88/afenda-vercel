/**
 * Client-safe door for governed-surface — components, Zod schemas, and pure helpers.
 * Do not import `#features/governed-surface` (index) from Client Components; it re-exports
 * server-only RSC sections that pull `#lib/auth` and `next/headers`.
 */
export {
  GovernedDataTableClient,
  type GovernedDataTableClientProps,
} from "./components/governed-data-table.client"

export {
  GovernedTrailingActionSlot,
  type GovernedTrailingActionSlotProps,
} from "./components/governed-trailing-action-slot.client"

export {
  GovernedKanbanFooterBoard,
  type GovernedKanbanFooterBoardProps,
} from "./components/governed-kanban-footer-board.client"

export {
  GovernedKanbanDragBoard,
  type GovernedKanbanDragBoardProps,
} from "./components/governed-kanban-drag-board.client"

export {
  GovernedKanbanTransitionHint,
  type GovernedKanbanTransitionHintProps,
} from "./components/governed-kanban-transition-hint.client"

export { GovernedEmpty, type GovernedEmptyProps } from "./components/governed-empty"

export {
  ActionFormErrors,
  type ActionFormErrorsProps,
} from "./components/action-form-errors"

export {
  isListSurfaceTrailingActionRenderable,
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
  type ResolveListSurfaceRowTrailingActionInput,
} from "./list-surface-trailing-action.shared"

export type { ListSurfaceRowTrailingAction } from "./schemas/list-surface-row-trailing-action.schema"

export {
  parseGovernedKanbanBoardConfiguration,
  type GovernedKanbanBoardConfiguration,
  type GovernedKanbanBoardConfigurationInput,
  type KanbanBadgeTone,
  type KanbanBoardCopy,
  type KanbanCard,
  type KanbanCardTransitionAvailability,
  type KanbanColumn,
  type KanbanInteractionMode,
  type KanbanWorkflowTransition,
} from "./schemas/kanban-board.schema"

export {
  buildKanbanCardMovePayload,
  isKanbanCardDraggable,
  resolveKanbanCardDropState,
  type KanbanCardDropState,
  type KanbanCardMovePayload,
} from "./kanban-card-drop.shared"

export {
  buildKanbanOutgoingTransitionHints,
  isKanbanCardTransitionRenderable,
  kanbanCardTransitionHidden,
  resolveKanbanCardTransition,
  type KanbanOutgoingTransitionTargetInput,
  type ResolveKanbanCardTransitionInput,
} from "./kanban-card-transition.shared"

export {
  governedKanbanBoardTestId,
  governedKanbanCardTestId,
  governedKanbanSectionTestId,
  resolveKanbanBoardDomProps,
} from "./kanban-surface-identity.shared"

export {
  governedComponentDiscriminatedSchema,
  governedComponentTypeSchema,
  parseGovernedComponentData,
  type GovernedComponent,
  type GovernedComponentType,
} from "./schemas/component.schema"
