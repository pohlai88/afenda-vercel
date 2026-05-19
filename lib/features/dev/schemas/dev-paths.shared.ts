import type { Route } from "next"

/** Locale-internal href — shell preview stays on this dev route for mock actions. */
export const SHELL_PREVIEW_HREF = "/dev/shell-preview" as Route

/** Locale-internal metadata renderer gallery (all shipped governed renderers). */
export const METADATA_RENDERER_GALLERY_HREF =
  "/dev/metadata-renderer-gallery" as Route

/** Locale-internal Pattern C section gallery. */
export const PATTERN_C_SECTION_GALLERY_HREF =
  "/dev/pattern-c-section-gallery" as Route

/** Locale-internal ask-docs path for utility bar Help (next-intl adds locale). */
export const SHELL_PREVIEW_ASK_DOCS_HREF = "/ask-docs" as unknown as Route

export const SHELL_PREVIEW_ORG_ID = "00000000-0000-0000-0000-00000000c0de"
