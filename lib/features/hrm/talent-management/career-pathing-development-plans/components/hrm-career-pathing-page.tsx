import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { requireOrgSession } from "#lib/auth"
import {
  searchParamFirst,
  type AppSearchParams,
} from "#lib/i18n/app-search-params.shared"

import { CareerPathingDashboardSection } from "./career-pathing-dashboard-section"
import { CareerPathingDiscussionsSection } from "./career-pathing-discussions-section"
import { CareerPathingFrameworksSection } from "./career-pathing-frameworks-section"
import { CareerPathingPlansSection } from "./career-pathing-plans-section"
import { CareerPathingReadinessSection } from "./career-pathing-readiness-section"
import { CareerPathingSkillGapsSection } from "./career-pathing-skill-gaps-section"
import { CareerPathingTargetRolesSection } from "./career-pathing-target-roles-section"

type HrmCareerPathingPageProps = {
  orgSlug: string
  isHrmAdmin: boolean
  searchParams?: AppSearchParams
}

export async function HrmCareerPathingPage({
  orgSlug,
  isHrmAdmin,
  searchParams = {},
}: HrmCareerPathingPageProps) {
  const session = await requireOrgSession()
  const organizationId = session.organizationId
  const t = await getTranslations("Dashboard.Hrm.careerPathing")

  const selectedPlanId = searchParamFirst(searchParams, "planId")
  const selectedFrameworkId = searchParamFirst(searchParams, "frameworkId")
  const selectedEmployeeId = searchParamFirst(searchParams, "employeeId")

  const sectionProps = {
    organizationId,
    orgSlug,
    isHrmAdmin,
    selectedPlanId,
    selectedFrameworkId,
    selectedEmployeeId,
  } as const

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <CareerPathingDashboardSection organizationId={organizationId} />
      <CareerPathingFrameworksSection {...sectionProps} />
      <CareerPathingTargetRolesSection {...sectionProps} />
      <CareerPathingSkillGapsSection
        organizationId={organizationId}
        selectedEmployeeId={selectedEmployeeId}
      />
      <CareerPathingPlansSection {...sectionProps} />
      <CareerPathingDiscussionsSection {...sectionProps} />
      <CareerPathingReadinessSection
        organizationId={organizationId}
        isHrmAdmin={isHrmAdmin}
      />
    </div>
  )
}
