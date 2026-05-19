export {
  METADATA_RENDERER_GALLERY_HREF,
  PATTERN_C_SECTION_GALLERY_HREF,
  SHELL_PREVIEW_ASK_DOCS_HREF,
  SHELL_PREVIEW_HREF,
  SHELL_PREVIEW_ORG_ID,
} from "./schemas/dev-paths.shared"

export type {
  GalleryPreviewMode,
  GalleryScenario,
} from "./schemas/gallery-scenario.types.shared"

export { SHELL_PREVIEW_COMMAND_PALETTE_PROPS } from "./data/shell-preview-fixtures/command-palette.fixture"
export {
  createShellPreviewMessengerTransport,
  SHELL_PREVIEW_MESSENGER_ORG_ID,
} from "./data/shell-preview-fixtures/messenger.fixture"
export {
  SHELL_PREVIEW_ACTIVE_SCOPES,
  SHELL_PREVIEW_OPERATIONAL_CONTEXT,
  SHELL_PREVIEW_ORG_POLICIES,
  SHELL_PREVIEW_SCOPE_CATALOG,
} from "./data/shell-preview-fixtures/operational-scope.fixture"
export { SHELL_PREVIEW_LIST_SURFACE } from "./data/shell-preview-fixtures/list-surface.fixture"
export { SHELL_PREVIEW_STAT_CARDS } from "./data/shell-preview-fixtures/stat-cards.fixture"
