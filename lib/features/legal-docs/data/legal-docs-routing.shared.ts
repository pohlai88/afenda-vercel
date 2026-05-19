import {
  declarationDocuments,
  type DeclarationSlug,
} from "./declaration-registry.shared"
import { LEGAL_ROUTE_PREFIX } from "./footer.shared"
import { APP_LOCALES } from "#lib/i18n/locales.shared"

import { publicTrustIndexableRoutes } from "./trust-surface.fixture.shared"

export type LegalDocsRouteKey = DeclarationSlug | "trust" | "status"

const legalDocsRoutePrefix = `${LEGAL_ROUTE_PREFIX}/`

function routeHrefToSlugSegments(routeHref: string): string[] {
  if (!routeHref.startsWith(legalDocsRoutePrefix)) {
    return []
  }
  const tail = routeHref.slice(legalDocsRoutePrefix.length)
  return tail ? tail.split("/") : []
}

const indexableRouteSet = new Set<string>(
  publicTrustIndexableRoutes as readonly string[]
)

export function resolveLegalDocsSlug(
  segments: readonly string[]
): LegalDocsRouteKey | null {
  const joined = segments.join("/")
  if (!joined) return null

  const href = `${LEGAL_ROUTE_PREFIX}/${joined}`
  if (!indexableRouteSet.has(href)) return null

  if (joined === "trust") return "trust"
  if (joined === "status") return "status"
  if (joined in declarationDocuments) return joined as DeclarationSlug

  return null
}

export function isLegalDeclarationSlug(
  key: LegalDocsRouteKey
): key is DeclarationSlug {
  return key in declarationDocuments
}

export function buildLegalDocsStaticParams(): {
  locale: string
  slug: string[]
}[] {
  const out: { locale: string; slug: string[] }[] = []

  for (const locale of APP_LOCALES) {
    for (const route of publicTrustIndexableRoutes) {
      out.push({
        locale,
        slug: routeHrefToSlugSegments(route),
      })
    }
  }

  return out
}
