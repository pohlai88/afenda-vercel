import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#features/governed-surface"
import { ErpAccessDenied } from "#features/erp-rbac/client"
import { requireOrgSession } from "#lib/auth"

import {
  isIsoDate,
  todayIsoDate,
} from "../../leave-attendance-management/data/attendance-display.shared"
import { addDaysIso } from "../data/sft-conflict-detect.shared"
import type { SftRosterListFilters } from "../data/sft-roster.queries.server"
import {
  resolveSftSurfaceAccess,
  type SftSurfaceAccess,
} from "../data/sft-access.server"
import { findSftEmployeeForUser } from "../data/sft.queries.server"
import { SftAttendanceCompareSection } from "./sft-attendance-compare-section"
import { SftCoverageSection } from "./sft-coverage-section"
import { SftManageSection } from "./sft-manage-section"
import { SftMySwapsSection } from "./sft-my-swaps-section"
import { SftPolicySection } from "./sft-policy-section"
import { SftPublicationsSection } from "./sft-publications-section"
import { SftRecurrenceSection } from "./sft-recurrence-section"
import { SftRosterSection } from "./sft-roster-section"
import { SftSwapPendingSection } from "./sft-swap-pending-section"
import { SftTemplatesSection } from "./sft-templates-section"
import {
  SftAvailabilitySection,
  SftHolidayPlannerSection,
  SftRestOffPlannerSection,
  SftScheduleChangePendingSection,
} from "./sft-workflow-sections"

type ShiftSchedulingPageProps = {
  orgSlug: string
  access?: SftSurfaceAccess
  organizationId?: string
  userId?: string
  rangeStart?: string
  rangeEnd?: string
  rosterFilters?: SftRosterListFilters
}

export async function ShiftSchedulingPage({
  orgSlug: _orgSlug,
  access: accessProp,
  organizationId: organizationIdProp,
  userId: userIdProp,
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
  rosterFilters = {},
}: ShiftSchedulingPageProps) {
  const orgSession =
    organizationIdProp && userIdProp
      ? { organizationId: organizationIdProp, userId: userIdProp }
      : await requireOrgSession()

  const { organizationId, userId } = orgSession

  const access =
    accessProp ?? (await resolveSftSurfaceAccess({ organizationId, userId }))

  const t = await getTranslations("Dashboard.Hrm.shiftScheduling")

  if (!access.canEnter) {
    return (
      <ErpAccessDenied
        title={t("accessDeniedTitle")}
        description={t("accessDeniedDescription")}
      />
    )
  }

  const rangeStart =
    rangeStartProp && isIsoDate(rangeStartProp)
      ? rangeStartProp
      : todayIsoDate()
  const rangeEnd =
    rangeEndProp && isIsoDate(rangeEndProp)
      ? rangeEndProp
      : addDaysIso(rangeStart, 13)

  const selfEmployee =
    access.hasSelfServiceEmployee && !access.canReadOrg
      ? await findSftEmployeeForUser(organizationId, userId)
      : null

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      {access.canReadOrg ? (
        <>
          <SftTemplatesSection
            organizationId={organizationId}
            canManage={access.canManage}
          />
          {access.canManage ? (
            <SftManageSection
              organizationId={organizationId}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              rosterFilters={rosterFilters}
            />
          ) : null}
          <SftRosterSection
            organizationId={organizationId}
            orgSlug={_orgSlug}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            rosterFilters={rosterFilters}
          />
          <SftRecurrenceSection
            organizationId={organizationId}
            canManage={access.canManage}
            rangeStart={rangeStart}
          />
          <SftAttendanceCompareSection
            organizationId={organizationId}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
          />
          <SftPolicySection
            organizationId={organizationId}
            canManage={access.canManage}
          />
          <SftCoverageSection
            organizationId={organizationId}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            canManage={access.canManage}
          />
          {access.canManage ? (
            <>
              <SftRestOffPlannerSection
                organizationId={organizationId}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                canManage={access.canManage}
              />
              <SftHolidayPlannerSection
                organizationId={organizationId}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                canManage={access.canManage}
              />
              <SftAvailabilitySection
                organizationId={organizationId}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                canManage={access.canManage}
              />
              <SftScheduleChangePendingSection
                organizationId={organizationId}
                canManage={access.canManage}
              />
            </>
          ) : null}
          <SftPublicationsSection organizationId={organizationId} />
          <SftSwapPendingSection
            organizationId={organizationId}
            canManage={access.canManage}
          />
        </>
      ) : selfEmployee ? (
        <SftMySwapsSection
          organizationId={organizationId}
          employeeId={selfEmployee.id}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("selfServiceHint")}</p>
      )}
    </div>
  )
}
