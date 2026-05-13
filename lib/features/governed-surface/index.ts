export type { SchemaStability } from "./schemas/_stability.shared"

export {
  SCHEMA_STABILITY as PAGE_HEADER_SCHEMA_STABILITY,
  pageHeaderSchema,
  parsePageHeaderData,
  type PageHeader,
} from "./schemas/page-header.schema"

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
  type ActionFieldErrors,
  type ActionResult,
  isActionFailure,
  isActionResultSuccess,
} from "./schemas/action-result.shared"

export {
  GovernedSurface,
  type GovernedSurfaceProps,
} from "./components/governed-surface"
export {
  GovernedSection,
  type GovernedSectionProps,
} from "./components/governed-section"
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
