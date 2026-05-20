import "server-only"

import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"

import { DemoBanner } from "#components2/demo/demo-banner.client"
import { DemoGuidePanel } from "#components2/demo/demo-guide-panel"
import { DemoShell } from "#components2/demo/demo-shell"
import { DemoSurfaceLayout } from "#components2/demo/demo-surface-layout"

import { redirectIfDemoShowcaseDisabled } from "../data/demo-route-gate.server"
import type { DemoGuideContent } from "../schemas/demo-guide.shared"
import type { DemoRouteDescriptionKey } from "../schemas/demo-route-page.shared"
import { findDemoManifestEntry } from "../schemas/demo-route-manifest.shared"

import { DemoRelatedDemos } from "./demo-related-demos.server"

type ComposeDemoRoutePageInput = {
  slug: string
  descriptionKey: DemoRouteDescriptionKey
  guide: DemoGuideContent
  main: ReactNode
  mirrorsFallback: string
}

export async function composeDemoRoutePage({
  slug,
  descriptionKey,
  guide,
  main,
  mirrorsFallback,
}: ComposeDemoRoutePageInput) {
  redirectIfDemoShowcaseDisabled()

  const manifest = findDemoManifestEntry(slug)
  const t = await getTranslations("Demo")

  return (
    <DemoShell
      title={manifest?.title ?? slug}
      description={manifest?.teaches ?? t(descriptionKey)}
      mirrors={manifest?.mirrors ?? mirrorsFallback}
    >
      <DemoBanner message={t("bannerMessage")} />
      <DemoSurfaceLayout main={main} aside={<DemoGuidePanel {...guide} />} />
      <DemoRelatedDemos currentSlug={slug} />
    </DemoShell>
  )
}
