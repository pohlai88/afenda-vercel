import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import { employeePortalProfilePath } from "#lib/portal"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { getEmployeePortalProfileSnapshot } from "../data/employee-portal-profile.queries.server"

import { EmployeePortalProfilePersonalForm } from "./employee-portal-profile-personal-form"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

function isoDate(value: Date | string | null | undefined): string {
  if (!value) return ""
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value.slice(0, 10)
}

type EmployeePortalProfilePersonalPageProps = {
  portalSlug: string
}

export async function EmployeePortalProfilePersonalPage({
  portalSlug,
}: EmployeePortalProfilePersonalPageProps) {
  const context = await requireEmployeePortalContext(portalSlug)
  const snapshot = await getEmployeePortalProfileSnapshot({
    organizationId: context.portal.organizationId,
    employeeId: context.employee.id,
  })
  if (!snapshot) notFound()

  const [t, navLabels] = await Promise.all([
    getTranslations("Dashboard.Hrm.portalProfile"),
    getEmployeePortalSectionNavLabels(),
  ])

  const employee = snapshot.employee
  const personal = snapshot.personalProfile

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2">
        <Link
          href={employeePortalProfilePath(portalSlug)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("backToHub")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("sections.personal.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("sections.personal.description")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="profile"
        labels={navLabels}
      />

      <EmployeePortalProfilePersonalForm
        portalSlug={portalSlug}
        defaults={{
          preferredName: employee.preferredName ?? "",
          dateOfBirth: isoDate(personal?.dateOfBirth ?? employee.dateOfBirth),
          gender: personal?.gender ?? employee.gender ?? "",
          nationality: personal?.nationality ?? employee.nationality ?? "",
          maritalStatus: personal?.maritalStatus ?? "",
        }}
      />
    </div>
  )
}
