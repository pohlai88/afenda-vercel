export type { SchemaStability } from "./schemas/_stability.shared"

export {
  SCHEMA_STABILITY as PAGE_HEADER_SCHEMA_STABILITY,
  pageHeaderSchema,
  parsePageHeaderData,
  type PageHeader,
} from "./schemas/page-header.schema"

export {
  erpPermissionRequirementSchema,
  type ErpPermissionRequirement,
} from "./schemas/erp-permission-requirement.schema"

export {
  SCHEMA_STABILITY as LIST_SURFACE_SCHEMA_STABILITY,
  emptyStateSchema,
  listColumnSchema,
  listSurfaceSchema,
  parseEmptyStateData,
  parseListSurfaceData,
  type EmptyState,
  type ListColumn,
  type ListSurface,
} from "./schemas/list-surface.schema"

export {
  SCHEMA_STABILITY as ACTION_DESCRIPTOR_SCHEMA_STABILITY,
  actionDescriptorSchema,
  parseActionDescriptorData,
  type ActionDescriptor,
} from "./schemas/action.schema"

export {
  SCHEMA_STABILITY as AUDIT_PANEL_SCHEMA_STABILITY,
  auditPanelRowSchema,
  auditPanelSchema,
  parseAuditPanelData,
  type AuditPanelModel,
  type AuditPanelRow,
} from "./schemas/audit-panel.schema"

export {
  SCHEMA_STABILITY as DETAIL_TABS_SCHEMA_STABILITY,
  governedDetailTabsSchema,
  parseGovernedDetailTabsData,
  type GovernedDetailSection,
  type GovernedDetailTabKind,
  type GovernedDetailTabsInput,
  type GovernedDetailTabsModel,
  type GovernedRevisionEntry,
} from "./schemas/detail-tabs.schema"

export {
  SCHEMA_STABILITY as STAT_CARD_SCHEMA_STABILITY,
  parseStatCardConfiguration,
  statCardConfigurationSchema,
  statCardDataNatureSchema,
  statCardDensitySchema,
  type StatCardConfiguration,
  type StatCardConfigurationInput,
  type StatCardDataNature,
  type StatCardDensity,
  type StatCardItem,
  type StatCardTone,
} from "./schemas/stat-card.schema"

export {
  SCHEMA_STABILITY as LIST_SURFACE_RENDERER_SCHEMA_STABILITY,
  listSurfaceRendererConfigurationSchema,
  parseListSurfaceRendererConfiguration,
  type ListSurfaceRendererConfiguration,
  type ListSurfaceRendererConfigurationInput,
  type ListSurfaceRow,
} from "./schemas/list-surface-renderer.schema"

export {
  GOVERNED_KANBAN_BOARD_SCHEMA_ID,
  GOVERNED_KANBAN_BOARD_SCHEMA_STABILITY,
  governedKanbanBoardConfigurationSchema,
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
  buildKanbanWorkflowFromColumnTransitions,
  indexKanbanWorkflowTransitions,
  isKanbanTransitionAllowed,
  kanbanTransitionId,
  validateKanbanCardTransitions,
} from "./kanban-workflow.shared"

export {
  buildKanbanOutgoingTransitionHints,
  isKanbanCardTransitionRenderable,
  kanbanCardTransitionHidden,
  resolveKanbanCardTransition,
  type KanbanOutgoingTransitionTargetInput,
  type ResolveKanbanCardTransitionInput,
} from "./kanban-card-transition.shared"

export {
  buildKanbanCardMovePayload,
  isKanbanCardDraggable,
  resolveKanbanCardDropState,
  type KanbanCardDropState,
  type KanbanCardMovePayload,
} from "./kanban-card-drop.shared"

export {
  SCHEMA_STABILITY as LIST_SURFACE_ROW_TRAILING_ACTION_SCHEMA_STABILITY,
  listSurfaceRowTrailingActionSchema,
  parseListSurfaceRowTrailingAction,
  type ListSurfaceRowTrailingAction,
} from "./schemas/list-surface-row-trailing-action.schema"

export {
  isListSurfaceTrailingActionRenderable,
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
  type ResolveListSurfaceRowTrailingActionInput,
} from "./list-surface-trailing-action.shared"

export {
  buildGovernedListSurfaceDataAttributes,
  buildGovernedListSurfaceRenderFingerprint,
  governedListRowTestId,
  governedListSectionTestId,
  governedListSurfaceTestId,
  summarizeListSurfaceTrailingActions,
  type GovernedListSurfaceDataAttributes,
  type GovernedListSurfaceRenderLogFields,
  type GovernedListSurfaceRenderState,
  type GovernedListSurfaceTrailingSummary,
} from "./list-surface-identity.shared"

export type { LogGovernedListSurfaceRenderInput } from "./log-governed-list-surface-render.server"

export {
  GOVERNED_COMPONENT_SCHEMA_ID,
  GOVERNED_COMPONENT_SCHEMA_STABILITY,
  governedComponentDiscriminatedSchema,
  governedComponentTypeSchema,
  parseGovernedComponentData,
  type GovernedComponent,
  type GovernedComponentType,
} from "./schemas/component.schema"

export {
  EMPTY_GOVERNED_COMPONENT_REGISTRY,
  SCHEMA_STABILITY as GOVERNED_COMPONENT_REGISTRY_SCHEMA_STABILITY,
  governedComponentRegistrySchema,
  parseGovernedComponentRegistryData,
  type GovernedComponentRegistry,
} from "./schemas/component-registry.schema"

export {
  FORM_EVENTS,
  SCHEMA_STABILITY as EVENT_HANDLER_SCHEMA_STABILITY,
  eventHandlerMetadataSchema,
  formEventIdSchema,
  parseEventHandlerMetadata,
  type EventHandlerMetadata,
  type FormEventId,
} from "./schemas/events.shared"

export {
  type ActionFieldErrors,
  type ActionResult,
  isActionFailure,
  isActionResultSuccess,
} from "./schemas/action-result.shared"

export {
  assertGovernedSurfaceInput,
  tryGovernedSurfaceInput,
  type GovernedSurfaceInputAssertion,
  type GovernedSurfaceInputAssertionError,
} from "./schemas/dev-assert.shared"

export {
  GOVERNED_METADATA_SCHEMA_VERSION,
  governedMetadataSchemaVersionSchema,
  type GovernedMetadataSchemaVersion,
} from "./schemas/schema-version.shared"

export {
  GOVERNED_FORM_RULES_SCHEMA_ID,
  GOVERNED_FORM_RULES_SCHEMA_STABILITY,
  formRuleConditionSchema,
  formRuleEffectSchema,
  formRuleFieldConditionSchema,
  formRuleSchema,
  parseFormRuleData,
  type FormRule,
  type FormRuleCondition,
  type FormRuleEffect,
  type FormRuleFieldCondition,
} from "./schemas/form-rules.schema"

export {
  evaluateFormRuleCondition,
  resolveFormFieldRuleState,
  type FormFieldRuleState,
  type FormRuleValues,
} from "./form-rules.evaluate.shared"

export { migrateGovernedConfiguration } from "./migrate-governed-configuration.shared"

export {
  ModulePageHeader,
  type ModulePageHeaderProps,
} from "./components/module-page-header"
export {
  GovernedSurface,
  type GovernedSurfaceProps,
} from "./components/governed-surface"
export {
  GovernedSection,
  type GovernedSectionProps,
} from "./components/governed-section"
export {
  GovernedSurfaceSectionCard,
  type GovernedSurfaceSectionCardBody,
  type GovernedSurfaceSectionCardProps,
} from "./components/governed-surface-section-card"
export {
  GovernedPatternCListSection,
  type GovernedPatternCListSectionLayout,
  type GovernedPatternCListSectionProps,
} from "./components/governed-pattern-c-list-section"
export {
  GovernedPatternBListSection,
  type GovernedPatternBListSectionLayout,
  type GovernedPatternBListSectionProps,
} from "./components/governed-pattern-b-list-section"
export {
  GovernedKanbanFooterSection,
  type GovernedKanbanFooterSectionLayout,
  type GovernedKanbanFooterSectionProps,
} from "./components/governed-kanban-footer-section"
/** Same RSC shell — pass `GovernedKanbanDragBoard` as children for `drag-reorder`. */
export {
  GovernedKanbanFooterSection as GovernedKanbanDragSection,
  type GovernedKanbanFooterSectionLayout as GovernedKanbanDragSectionLayout,
  type GovernedKanbanFooterSectionProps as GovernedKanbanDragSectionProps,
} from "./components/governed-kanban-footer-section"
export {
  governedKanbanBoardTestId,
  governedKanbanCardTestId,
  resolveKanbanBoardDomProps,
  governedKanbanSectionTestId,
} from "./kanban-surface-identity.shared"
export {
  GovernedEmpty,
  type GovernedEmptyProps,
} from "./components/governed-empty"
export {
  GovernedListSurface,
  type GovernedListSurfaceProps,
} from "./components/governed-list-surface"
export {
  ActionFormErrors,
  type ActionFormErrorsProps,
} from "./components/action-form-errors"
export {
  GovernedAuditPanel,
  type GovernedAuditPanelProps,
} from "./components/governed-audit-panel"
export {
  GovernedDetailTabs,
  type GovernedDetailTabsProps,
} from "./components/governed-detail-tabs"
