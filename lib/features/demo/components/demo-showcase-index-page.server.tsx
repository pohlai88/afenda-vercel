import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"

import { DemoCatalogCard } from "#components2/demo/demo-catalog-card"
import { DemoShell } from "#components2/demo/demo-shell"

import { redirectIfDemoShowcaseDisabled } from "../data/demo-route-gate.server"
import { listDemoRoutesByCategory } from "../schemas/demo-route-manifest.shared"

export async function generateDemoShowcaseMetadata(): Promise<Metadata> {
  const t = await getTranslations("Demo")
  return {
    title: t("indexTitle"),
    description: t("indexDescription"),
    robots: { index: true, follow: true },
  }
}

export default async function DemoShowcaseIndexPage() {
  redirectIfDemoShowcaseDisabled()

  const t = await getTranslations("Demo")
  const groups = listDemoRoutesByCategory()

  return (
    <DemoShell
      title={t("indexTitle")}
      description={t("indexDescription")}
      mirrors="Afenda ERP production routes (authenticated)"
    >
      <div className="flex flex-col gap-10">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t("catalogHeading")}</h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("catalogSubheading")}
          </p>
        </section>

        {groups.map((group) => (
          <section key={group.category} className="flex flex-col gap-4">
            <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
              {group.category}
            </h3>
            <ul className="grid gap-4 sm:grid-cols-2">
              {group.entries.map((entry) => (
                <li key={entry.slug}>
                  <DemoCatalogCard
                    entry={entry}
                    statusLabelAvailable={t("statusAvailable")}
                    statusLabelPlanned={t("statusPlanned")}
                    ctaOpen={t("ctaOpen")}
                    ctaPlanned={t("ctaPlanned")}
                    mirrorsLabel={t("mirrorsLabel")}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DemoShell>
  )
}
