/**
 * Visual helpers derived from governed surface chrome tokens.
 * Separated per ADR-0011 §10 — schema modules govern shape only.
 * Imported by renderers; never from schema modules.
 */
import type {
  GovernedSurfaceDensity,
  GovernedSurfaceElevation,
  GovernedSurfaceMaterial,
} from "./surface-chrome.schema"

export function densityGapClass(
  density: GovernedSurfaceDensity = "comfortable"
): string {
  switch (density) {
    case "compact":
      return "gap-density-compact"
    case "relaxed":
      return "gap-density-relaxed"
    case "comfortable":
      return "gap-density-comfortable"
  }
}

export function elevationClass(
  elevation: GovernedSurfaceElevation = "card"
): string {
  switch (elevation) {
    case "flat":
      return "shadow-none"
    case "raised":
      return "shadow-elevation-2"
    case "card":
      return "shadow-elevation-1"
  }
}

export function surfaceMaterialClass(
  surface: GovernedSurfaceMaterial = "solid"
): string {
  switch (surface) {
    case "muted":
      return "bg-muted/30"
    case "subtle":
      return "bg-card/60"
    case "solid":
      return "bg-card"
  }
}
