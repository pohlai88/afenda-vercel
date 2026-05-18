import "server-only"

import { cache } from "react"

import { rootLogger } from "#lib/logger.server"

import {
  buildGovernedListSurfaceRenderFingerprint,
  type GovernedListSurfaceRenderLogFields,
} from "./list-surface-identity.shared"

export type LogGovernedListSurfaceRenderInput = GovernedListSurfaceRenderLogFields

function governedListSurfaceDiagnosticsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.GOVERNED_LIST_SURFACE_DIAGNOSTICS === "1"
  )
}

const logGovernedListSurfaceRenderOnce = cache(
  (fingerprint: string, input: LogGovernedListSurfaceRenderInput) => {
    if (!governedListSurfaceDiagnosticsEnabled()) {
      return
    }

    rootLogger.info(
      {
        governedSurface: {
          fingerprint,
          surfaceKey: input.surfaceKey,
          columnsId: input.columnsId,
          dataNature: input.dataNature,
          presentationVariant: input.presentationVariant,
          density: input.density,
          state: input.state,
          rowCount: input.rowCount,
          trailing: input.trailing,
        },
      },
      "governed.list_surface.render"
    )
  }
)

/**
 * Structured render trace for Pattern C list surfaces (dev / opt-in prod).
 * Deduped once per request per fingerprint via `React.cache`.
 */
export function logGovernedListSurfaceRender(
  input: LogGovernedListSurfaceRenderInput
): void {
  const fingerprint = buildGovernedListSurfaceRenderFingerprint(input)
  logGovernedListSurfaceRenderOnce(fingerprint, input)
}

export { buildGovernedListSurfaceRenderFingerprint }
