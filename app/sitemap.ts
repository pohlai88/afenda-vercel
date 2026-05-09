import type { MetadataRoute } from "next"

import {
  declarationRouteReviewedAtByHref,
  latestLegalDeclarationReviewedAt,
} from "#features/legal-declarations"
import { publicTrustIndexableRoutes } from "#features/public-trust"
import {
  type AppPath,
  DEFAULT_APP_LOCALE,
  toLocalePath,
} from "#lib/i18n/locales.shared"
import { getSiteUrl } from "#lib/site"

function routePriority(path: AppPath): number {
  if (path === "/") return 1
  if (path === "/legal/trust") return 0.8
  return 0.7
}

/** Only include indexable public URLs (omit auth/app shells with noindex). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl().replace(/\/$/, "")
  const publicPaths = ["/", ...publicTrustIndexableRoutes] as readonly AppPath[]

  return publicPaths.map((path) => ({
    url: `${base}${toLocalePath(DEFAULT_APP_LOCALE, path)}`,
    lastModified:
      path === "/"
        ? latestLegalDeclarationReviewedAt
        : (declarationRouteReviewedAtByHref[path] ??
          latestLegalDeclarationReviewedAt),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: routePriority(path),
  }))
}
