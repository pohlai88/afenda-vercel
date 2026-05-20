import type { EmptyState } from "#features/governed-surface"

export type GeolocationLoadError = {
  title: string
  description?: string
  variant?: EmptyState["variant"]
}

export function toGeolocationListLoadError(
  loadError: GeolocationLoadError | undefined
): EmptyState | undefined {
  if (!loadError) return undefined
  return {
    variant: loadError.variant ?? "error",
    title: loadError.title,
    description: loadError.description,
  }
}
