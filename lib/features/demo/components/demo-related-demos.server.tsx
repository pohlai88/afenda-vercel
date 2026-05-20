import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"

import { DEMO_ROUTE_MANIFEST } from "../schemas/demo-route-manifest.shared"
import { demoPath } from "../schemas/demo-paths.shared"

type DemoRelatedDemosProps = {
  currentSlug: string
}

export async function DemoRelatedDemos({ currentSlug }: DemoRelatedDemosProps) {
  const t = await getTranslations("Demo")

  return (
    <section className="mt-10 border-t border-border pt-8">
      <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
        {t("relatedHeading")}
      </h2>
      <ul className="mt-3 flex flex-wrap gap-3 text-sm">
        {DEMO_ROUTE_MANIFEST.filter((entry) => entry.slug !== currentSlug).map(
          (entry) => (
            <li key={entry.slug}>
              {entry.status === "available" ? (
                <Link
                  href={demoPath(entry.slug)}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  prefetch={false}
                >
                  {entry.title}
                </Link>
              ) : (
                <span className="text-muted-foreground">
                  {entry.title} ({t("statusPlanned")})
                </span>
              )}
            </li>
          )
        )}
      </ul>
    </section>
  )
}
