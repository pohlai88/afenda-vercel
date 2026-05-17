import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { employeePortalProfilePath } from "#lib/portal"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"

import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalProfilePageProps = {
  portalSlug: string
}

export async function EmployeePortalProfilePage({
  portalSlug,
}: EmployeePortalProfilePageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const [t, navLabels] = await Promise.all([
    getTranslations("Dashboard.Hrm.portalProfile"),
    getEmployeePortalSectionNavLabels(),
  ])

  const sections = [
    {
      key: "personal" as const,
      href: employeePortalProfilePath(portalSlug, "personal"),
    },
    {
      key: "emergency" as const,
      href: employeePortalProfilePath(portalSlug, "emergency"),
    },
    {
      key: "banking" as const,
      href: employeePortalProfilePath(portalSlug, "banking"),
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("pageDescription")}</p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="profile"
        labels={navLabels}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {sections.map((section) => (
          <Link key={section.key} href={section.href}>
            <Card className="h-full transition-colors hover:bg-accent/40">
              <CardHeader>
                <CardTitle className="text-base">
                  {t(`sections.${section.key}.title`)}
                </CardTitle>
                <CardDescription>
                  {t(`sections.${section.key}.description`)}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
