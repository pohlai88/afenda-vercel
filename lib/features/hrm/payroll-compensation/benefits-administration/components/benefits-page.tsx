import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import {
  HRM_BENEFITS_DEFAULT_TAB,
  isHrmBenefitsTab,
} from "../data/benefit-display.shared"
import { loadBenefitsPageTabData } from "../data/benefits-page-data.server"

import { BenefitEnrollmentDialog } from "./benefit-enrollment-dialog"
import { BenefitEnrollmentsSection } from "./benefit-enrollments-section"
import { BenefitLifeEventRecordDialog } from "./benefit-life-event-record-dialog"
import { BenefitLifeEventsSection } from "./benefit-life-events-section"
import { BenefitOpenEnrollmentPanel } from "./benefit-open-enrollment-panel"
import { BenefitOpenEnrollmentWindowsSection } from "./benefit-open-enrollment-windows-section"
import { BenefitClaimReferencesSection } from "./benefit-claim-references-section"
import { BenefitPlansSection } from "./benefit-plans-section"
import { BenefitProvidersSection } from "./benefit-providers-section"
import { BenefitReportsPanel } from "./benefit-reports-panel"
import { BenefitsTabNav } from "./benefits-tab-nav"

type BenefitsPageProps = {
  orgSlug: string
  tabParam?: string
}

/**
 * Benefits administration surface (Phase 5). Authority is established by
 * the parent HRM layout; this page re-checks the org-admin gate for UX
 * parity with Policies and Claims. Tab-specific data loads avoid fetching
 * every tab on each navigation.
 */
export async function BenefitsPage({ orgSlug, tabParam }: BenefitsPageProps) {
  const orgSession = await requireOrgSession()

  const activeTab =
    tabParam && isHrmBenefitsTab(tabParam) ? tabParam : HRM_BENEFITS_DEFAULT_TAB

  const [t, isAdmin, tabData] = await Promise.all([
    getTranslations("Dashboard.Hrm.benefits"),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "benefit",
      function: "update",
    }),
    loadBenefitsPageTabData(orgSession.organizationId, activeTab),
  ])

  const {
    employees,
    plans,
    enrollments,
    lifeEvents,
    openEnrollmentWindows,
    dependents,
    benefitProviders,
    allBenefitProviders,
    claimReferences,
  } = tabData

  const providerChoices = benefitProviders.map((provider) => ({
    id: provider.id,
    code: provider.code,
    name: provider.name,
  }))

  const activePlans = plans.filter((p) => p.isActive)
  const planChoices = activePlans.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }))

  const enrollmentChoices = enrollments.map((enrollment) => ({
    id: enrollment.enrollmentId,
    label: `${enrollment.employeeLegalName} — ${enrollment.benefitName} (${enrollment.state})`,
  }))

  const enrollmentLabels = new Map<string, string>(
    enrollmentChoices.map((choice) => [choice.id, choice.label])
  )

  const providerCatalogChoices = allBenefitProviders.map((provider) => ({
    id: provider.id,
    code: provider.code,
    name: provider.name,
  }))

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      {!isAdmin ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("memberRestrictedTitle")}</CardTitle>
            <CardDescription>{t("memberRestrictedBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <BenefitsTabNav orgSlug={orgSlug} activeTab={activeTab} />

      {activeTab === "plans" ? (
        <BenefitPlansSection
          isAdmin={isAdmin}
          plans={plans}
          providers={providerChoices}
        />
      ) : null}

      {activeTab === "providers" ? (
        <BenefitProvidersSection isAdmin={isAdmin} providers={allBenefitProviders} />
      ) : null}

      {activeTab === "enrollments" ? (
        <Card size="sm" className="border-solid border-border">
          <CardHeader>
            <CardTitle>{t("tabEnrollmentsTitle")}</CardTitle>
            <CardDescription>{t("tabEnrollmentsDescription")}</CardDescription>
            {isAdmin && employees.length > 0 && activePlans.length > 0 ? (
              <div className="pt-2">
                <BenefitEnrollmentDialog
                  employees={employees}
                  plans={planChoices}
                  dependents={dependents}
                />
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isAdmin && employees.length === 0 ? (
              <Card size="sm" className="border-dashed">
                <CardHeader>
                  <CardTitle>{t("noEmployeesTitle")}</CardTitle>
                  <CardDescription>{t("noEmployeesBody")}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}
            {isAdmin && employees.length > 0 && activePlans.length === 0 ? (
              <Card size="sm" className="border-dashed">
                <CardHeader>
                  <CardTitle>{t("noActivePlansTitle")}</CardTitle>
                  <CardDescription>{t("noActivePlansBody")}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}
            <BenefitEnrollmentsSection isAdmin={isAdmin} rows={enrollments} />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "claimReferences" ? (
        <BenefitClaimReferencesSection
          isAdmin={isAdmin}
          rows={claimReferences}
          enrollments={enrollmentChoices}
          providers={providerCatalogChoices}
          enrollmentLabels={enrollmentLabels}
        />
      ) : null}

      {activeTab === "openEnrollment" ? (
        <Card size="sm" className="border-solid border-border">
          <CardHeader>
            <CardTitle>{t("tabOpenEnrollmentTitle" as never)}</CardTitle>
            <CardDescription>
              {t("tabOpenEnrollmentDescription" as never)}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <BenefitOpenEnrollmentPanel isAdmin={isAdmin} plans={planChoices} />
            <BenefitOpenEnrollmentWindowsSection
              isAdmin={isAdmin}
              windows={openEnrollmentWindows}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "reports" ? (
        <BenefitReportsPanel
          organizationId={orgSession.organizationId}
          plans={plans}
          enrollments={enrollments}
          lifeEvents={lifeEvents}
        />
      ) : null}

      {activeTab === "life" ? (
        <Card size="sm" className="border-solid border-border">
          <CardHeader>
            <CardTitle>{t("tabLifeTitle")}</CardTitle>
            <CardDescription>{t("tabLifeDescription")}</CardDescription>
            {isAdmin && employees.length > 0 ? (
              <div className="pt-2">
                <BenefitLifeEventRecordDialog employees={employees} />
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {isAdmin && employees.length === 0 ? (
              <Card size="sm" className="border-dashed">
                <CardHeader>
                  <CardTitle>{t("noEmployeesTitle")}</CardTitle>
                  <CardDescription>{t("noEmployeesBody")}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}
            <BenefitLifeEventsSection isAdmin={isAdmin} rows={lifeEvents} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
