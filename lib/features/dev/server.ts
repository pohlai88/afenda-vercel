import "server-only"

export { redirectIfProductionDevRoute } from "./data/dev-route-gate.server"
export { GALLERY_SCENARIOS } from "./data/gallery-scenarios"
export type {
  GalleryPreviewMode,
  GalleryScenario,
} from "./data/gallery-scenarios"
export {
  GALLERY_ACTION_BAR,
  GALLERY_APPROVAL_TIMELINE,
  GALLERY_AUDIT_PANEL,
  GALLERY_CHART_TIME_SERIES,
  GALLERY_DETAIL_TABS,
  GALLERY_EMPTY,
  GALLERY_KANBAN_CLAIMS_FOOTER,
  GALLERY_KANBAN_RECRUITMENT,
  GALLERY_KANBAN_RECRUITMENT_DRAG,
  GALLERY_KANBAN_RECRUITMENT_FOOTER_ACTIONS,
  GALLERY_LIST_SURFACE_DOCUMENT_LINES,
  GALLERY_LIST_SURFACE_TABLE,
  GALLERY_MULTI_STEP_ONBOARDING,
  GALLERY_SCORECARD_INTERVIEW,
  GALLERY_SECTION,
  GALLERY_STACK,
  GALLERY_STAT_CARD_KPI,
  GALLERY_STAT_CARD_SNAPSHOT,
} from "./data/gallery-fixtures"
export {
  GALLERY_PATTERN_C_EMPTY,
  GALLERY_PATTERN_C_INVALID,
  GALLERY_PATTERN_C_READY,
} from "./data/pattern-c-gallery-fixtures"
export {
  METADATA_RENDERER_GALLERY_HREF,
  PATTERN_C_SECTION_GALLERY_HREF,
  SHELL_PREVIEW_ASK_DOCS_HREF,
  SHELL_PREVIEW_HREF,
  SHELL_PREVIEW_ORG_ID,
} from "./schemas/dev-paths.shared"
export { default as DevShellPreviewPage } from "./components/dev-shell-preview-page.server"
export { default as DevMetadataRendererGalleryPage } from "./components/dev-metadata-renderer-gallery-page.server"
export { default as DevPatternCSectionGalleryPage } from "./components/dev-pattern-c-section-gallery-page.server"
