import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import { employeePortalProfilePath } from "#lib/portal"

import { requireEmployeePortalContext } from "../data/employee-portal-access.server"
import { getEmployeePortalSectionNavLabels } from "../data/employee-portal-nav-labels.server"
import { getEmployeePortalProfileSnapshot } from "../data/employee-portal-profile.queries.server"

import { EmployeePortalProfileBankingForm } from "./employee-portal-profile-banking-form"
import { EmployeePortalSectionNav } from "./employee-portal-section-nav"

type EmployeePortalProfileBankingPageProps = {
  portalSlug: string
}

export async function EmployeePortalProfileBankingPage({
  portalSlug,
}: EmployeePortalProfileBankingPageProps) {
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

  const payroll = snapshot.payrollProfile

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
          {t("sections.banking.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("sections.banking.description")}
        </p>
      </header>

      <EmployeePortalSectionNav
        portalSlug={context.portal.portalSlug}
        current="profile"
        labels={navLabels}
      />

      {payroll ? (
        <EmployeePortalProfileBankingForm
          portalSlug={portalSlug}
          defaults={{
            bankCode: payroll.bankCode ?? "",
            bankAccountHolderName: payroll.bankAccountHolderName ?? "",
            bankAccountTokenized: payroll.bankAccountTokenized ?? "",
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("bankingUnavailable")}
        </p>
      )}
    </div>
  )
}
