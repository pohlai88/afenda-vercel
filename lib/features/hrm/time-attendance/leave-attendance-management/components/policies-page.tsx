import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Skeleton } from "#components2/ui/skeleton"
import { requireOrgSession } from "#lib/auth"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

import {
  HRM_POLICY_DEFAULT_TAB,
  isHrmPolicyTab,
} from "../data/leave-policy-display.shared"

import { PoliciesLeaveTypesSection } from "./policies-leave-types-section"
import { PoliciesLeaveBlackoutSection } from "./policies-leave-blackout-section"
import { PoliciesOrgHolidaysSection } from "./policies-org-holidays-section"
import { PoliciesSeedMyEa2023Dialog } from "./policies-seed-my-ea-2023-dialog"
import { PoliciesStatutorySection } from "./policies-statutory-section"
import { PoliciesTabNav } from "./policies-tab-nav"
import { PoliciesWorkingPatternSection } from "./policies-working-pattern-section"
import { LeaveTypeCreateDialog } from "./policies-leave-type-create-dialog"

/**
 * HR Policies workbench (PR #4 ÔÇö UI binding for the shipped Phase 2A
 * leave-type / leave-policy Server Actions). Composition responsibility:
 *
 *  - **Authority** is established by the parent layout (`requireOrgSession`
 *    via the workbench shell) and re-validated here for the admin-only
 *    member-restriction copy. The mutation actions themselves enforce
 *    `requireHrmAdmin` independently ÔÇö this gate is UX, not security.
 *  - **Tier A** (admin gate + translations) sits in a single blocking
 *    `Promise.all` so the page renders the header + tab navigator
 *    immediately.
 *  - **Tier B** (the leave-types table) streams behind a Suspense
 *    boundary so a slow catalog scan never blocks first paint.
 *
 * The active tab is URL-driven (`?tab=ÔÇª&includeArchived=ÔÇª`) so deep
 * links and refresh produce the same view. Members see a calm
 * read-only "admin-only" panel ÔÇö no create / seed affordances are
 * rendered because the underlying actions would refuse anyway.
 *
 * Holidays / working pattern / statutory rates are reserved inspectors.
 * They render a calm "coming soon" panel today so operators can see
 * where the surface is heading without being misled into thinking the
 * editor is missing.
 */
type PoliciesPageProps = {
  orgSlug: string
  tabParam?: string
  includeArchivedParam?: string
}

export async function PoliciesPage({
  orgSlug,
  tabParam,
  includeArchivedParam,
}: PoliciesPageProps) {
  await requireOrgSession()

  const [t, isAdmin] = await Promise.all([
    getTranslations("Dashboard.Hrm.policies"),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "policy",
      function: "update",
    }),
  ])

  // Re-validate URL-supplied tab against the canonical enum so a future
  // tab rename / removal cannot leave dangling deep links pointing at a
  // missing branch. `includeArchived=true` is the only truthy value we
  // accept ÔÇö anything else collapses to "active only".
  const activeTab =
    tabParam && isHrmPolicyTab(tabParam) ? tabParam : HRM_POLICY_DEFAULT_TAB
  const includeArchived = includeArchivedParam === "true"

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

      <PoliciesTabNav
        orgSlug={orgSlug}
        activeTab={activeTab}
        includeArchived={includeArchived}
      />

      {activeTab === "leave_types" ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("leaveTypes.title")}</CardTitle>
            <CardDescription>{t("leaveTypes.description")}</CardDescription>
            {isAdmin ? (
              <CardAction>
                <div className="flex flex-wrap items-center gap-2">
                  <PoliciesSeedMyEa2023Dialog />
                  <LeaveTypeCreateDialog />
                </div>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent>
            <Suspense
              // Re-key so toggling "include archived" replays the
              // skeleton instead of holding stale rows.
              key={`leave-types-${includeArchived ? "archived" : "active"}`}
              fallback={<PoliciesTableSkeleton />}
            >
              <PoliciesLeaveTypesSection
                isAdmin={isAdmin}
                includeArchived={includeArchived}
                orgSlug={orgSlug}
              />
            </Suspense>
          </CardContent>
        </Card>
      ) : null}

      {activeTab === "holidays" ? (
        <PoliciesOrgHolidaysSection isAdmin={isAdmin} />
      ) : null}

      {activeTab === "blackout" ? (
        <PoliciesLeaveBlackoutSection isAdmin={isAdmin} />
      ) : null}

      {activeTab === "working_pattern" ? (
        <PoliciesWorkingPatternSection orgSlug={orgSlug} />
      ) : null}

      {activeTab === "statutory" ? (
        <PoliciesStatutorySection />
      ) : null}
    </div>
  )
}

function PoliciesTableSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}
