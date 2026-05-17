import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { requireOrgSession } from "#lib/tenant"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import {
  listBenefitClaimReferencesForOrganization,
  listBenefitEnrollmentsForOrganization,
  listBenefitOpenEnrollmentsForOrg,
  listBenefitPlansForOrganization,
  listBenefitProvidersForOrganization,
  listLifeEventsForOrganization,
} from "../server"
import { listActiveEmployeeChoicesForLeave } from "../../../server"
import { listDependentsForOrganization } from "../../../employee-management/employee-records-management/data/dependent.queries.server"

import {
  HRM_BENEFITS_DEFAULT_TAB,
  isHrmBenefitsTab,
} from "../data/benefit-display.shared"

import { BenefitEnrollmentDialog } from "./benefit-enrollment-dialog"
import { BenefitEnrollmentTable } from "./benefit-enrollment-table"
import { BenefitLifeEventRecordDialog } from "./benefit-life-event-record-dialog"
import { BenefitLifeEventsTable } from "./benefit-life-events-table"
import { BenefitOpenEnrollmentPanel } from "./benefit-open-enrollment-panel"
import { BenefitClaimReferencesTable } from "./benefit-claim-references-table"
import { BenefitPlansTable } from "./benefit-plans-table"
import { BenefitProvidersTable } from "./benefit-providers-table"
import { BenefitReportsPanel } from "./benefit-reports-panel"
import { BenefitsTabNav } from "./benefits-tab-nav"

type BenefitsPageProps = {
  orgSlug: string
  tabParam?: string
}

/**
 * Benefits administration surface (Phase 5). Authority is established by
 * the parent HRM layout; this page re-checks the org-admin gate for UX
 * parity with Policies and Claims. Data loads in a single Tier A
 * `Promise.all` so tab switches stay server-driven via the URL.
 */
export async function BenefitsPage({ orgSlug, tabParam }: BenefitsPageProps) {
  const orgSession = await requireOrgSession()

  const activeTab =
    tabParam && isHrmBenefitsTab(tabParam) ? tabParam : HRM_BENEFITS_DEFAULT_TAB

  const [
    t,
    isAdmin,
    employees,
    plans,
    enrollments,
    lifeEvents,
    openEnrollmentWindows,
    dependents,
    benefitProviders,
    allBenefitProviders,
    claimReferences,
  ] = await Promise.all([
    getTranslations("Dashboard.Hrm.benefits"),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "benefit",
      function: "update",
    }),
    listActiveEmployeeChoicesForLeave(orgSession.organizationId),
    listBenefitPlansForOrganization(orgSession.organizationId, {
      limit: 200,
    }),
    listBenefitEnrollmentsForOrganization(orgSession.organizationId, {
      limit: 500,
    }),
    listLifeEventsForOrganization(orgSession.organizationId, { limit: 300 }),
    listBenefitOpenEnrollmentsForOrg(orgSession.organizationId),
    listDependentsForOrganization(orgSession.organizationId),
    listBenefitProvidersForOrganization(orgSession.organizationId, {
      isActive: true,
      limit: 200,
    }),
    listBenefitProvidersForOrganization(orgSession.organizationId, {
      limit: 200,
    }),
    listBenefitClaimReferencesForOrganization(orgSession.organizationId, 500),
  ])

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

  const enrollmentLabels = new Map(
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
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("tabPlansTitle")}</CardTitle>
            <CardDescription>{t("tabPlansDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <BenefitPlansTable
              isAdmin={isAdmin}
              plans={plans}
              providers={providerChoices}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "providers" ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("tabProvidersTitle")}</CardTitle>
            <CardDescription>{t("tabProvidersDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <BenefitProvidersTable
              isAdmin={isAdmin}
              providers={allBenefitProviders}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "enrollments" ? (
        <Card size="sm">
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
            <BenefitEnrollmentTable isAdmin={isAdmin} rows={enrollments} />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "claimReferences" ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("tabClaimReferencesTitle")}</CardTitle>
            <CardDescription>
              {t("tabClaimReferencesDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BenefitClaimReferencesTable
              isAdmin={isAdmin}
              rows={claimReferences}
              enrollments={enrollmentChoices}
              providers={providerCatalogChoices}
              enrollmentLabels={enrollmentLabels}
            />
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "openEnrollment" ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("tabOpenEnrollmentTitle")}</CardTitle>
            <CardDescription>{t("tabOpenEnrollmentDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <BenefitOpenEnrollmentPanel
              isAdmin={isAdmin}
              windows={openEnrollmentWindows}
              plans={planChoices}
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
        <Card size="sm">
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
            <BenefitLifeEventsTable isAdmin={isAdmin} rows={lifeEvents} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
