import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import { employeePortalProfilePath } from "#lib/portal"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { getEmployeePortalProfileSnapshot } from "../data/employee-portal-profile.queries.server"

import { EmployeePortalProfileEmergencyForm } from "./employee-portal-profile-emergency-form"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

function addressField(
  address: Record<string, unknown> | null | undefined,
  key: string
): string {
  if (!address) return ""
  const value = address[key]
  return typeof value === "string" ? value : ""
}

type EmployeePortalProfileEmergencyPageProps = {
  portalSlug: string
}

export async function EmployeePortalProfileEmergencyPage({
  portalSlug,
}: EmployeePortalProfileEmergencyPageProps) {
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

  const contact = snapshot.contactProfile ?? {
    personalEmail: null,
    personalPhone: null,
    address: null,
  }
  const address = contact.address

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
          {t("sections.emergency.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("sections.emergency.description")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="profile"
        labels={navLabels}
      />

      <EmployeePortalProfileEmergencyForm
        portalSlug={portalSlug}
        defaults={{
          personalEmail: contact.personalEmail ?? "",
          personalPhone: contact.personalPhone ?? "",
          addressLine1: addressField(address, "line1"),
          addressLine2: addressField(address, "line2"),
          city: addressField(address, "city"),
          region: addressField(address, "region"),
          postalCode: addressField(address, "postalCode"),
          countryCode: addressField(address, "countryCode"),
        }}
      />
    </div>
  )
}
