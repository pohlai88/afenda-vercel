import type { EmptyState } from "#features/governed-surface"

export type TimeClockLoadError = {
  title: string
  description?: string
  variant?: EmptyState["variant"]
}

export function toTimeClockListLoadError(
  loadError: TimeClockLoadError | undefined
): EmptyState | undefined {
  if (!loadError) return undefined
  return {
    variant: loadError.variant ?? "error",
    title: loadError.title,
    description: loadError.description,
  }
}
