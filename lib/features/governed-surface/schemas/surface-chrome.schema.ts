import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

export const GOVERNED_SURFACE_CHROME_SCHEMA_ID =
  "governed.surface-chrome" as const

export const GOVERNED_SURFACE_CHROME_SCHEMA_STABILITY: SchemaStability = "beta"

export const governedSurfaceDensitySchema = z.enum([
  "compact",
  "comfortable",
  "relaxed",
])

export const governedSurfaceElevationSchema = z.enum([
  "flat",
  "card",
  "raised",
])

export const governedSurfaceMaterialSchema = z.enum([
  "solid",
  "muted",
  "subtle",
])

export const governedSurfaceChromeSchema = z
  .object({
    density: governedSurfaceDensitySchema.default("comfortable"),
    elevation: governedSurfaceElevationSchema.default("card"),
    surface: governedSurfaceMaterialSchema.default("solid"),
  })
  .strict()

export type GovernedSurfaceDensity = z.infer<
  typeof governedSurfaceDensitySchema
>

export type GovernedSurfaceElevation = z.infer<
  typeof governedSurfaceElevationSchema
>

export type GovernedSurfaceMaterial = z.infer<
  typeof governedSurfaceMaterialSchema
>

export type GovernedSurfaceChrome = z.infer<typeof governedSurfaceChromeSchema>
export type GovernedSurfaceChromeInput = z.input<
  typeof governedSurfaceChromeSchema
>

export function parseGovernedSurfaceChromeData(raw: unknown) {
  return governedSurfaceChromeSchema.safeParse(raw)
}

