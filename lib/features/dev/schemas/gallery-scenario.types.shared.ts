import type { GovernedComponent } from "#features/governed-surface/schemas/component.schema"

export type GalleryPreviewMode =
  | "default"
  | "kanban-footer-actions"
  | "kanban-drag-reorder"

export type GalleryScenario = {
  id: string
  title: string
  description: string
  minWidthPx?: number
  component: GovernedComponent
  diagnostics?: "user" | "operator"
  previewMode?: GalleryPreviewMode
}
