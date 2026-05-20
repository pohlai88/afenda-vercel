import "server-only"

import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import type { DemoRouteDescriptionKey } from "../schemas/demo-route-page.shared"
import { findDemoManifestEntry } from "../schemas/demo-route-manifest.shared"

export async function generateDemoRouteMetadata(
  slug: string,
  descriptionKey: DemoRouteDescriptionKey
): Promise<Metadata> {
  const entry = findDemoManifestEntry(slug)
  const t = await getTranslations("Demo")

  return {
    title: entry?.title ?? t("indexTitle"),
    description: entry?.teaches ?? t(descriptionKey),
    robots: { index: true, follow: true },
  }
}
