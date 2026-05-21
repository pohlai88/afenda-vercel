import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { logUnexpectedServerError } from "#lib/logger.server"

import { listActiveEmployeeChoicesForLeave } from "../../../time-attendance/leave-attendance-management/data/leave-request.queries.server"
import { buildCareerPathingEmbeddedListSurfaceErrorConfiguration } from "../data/career-pathing-embedded-list-surface-error.server"
import { buildTargetRolesListSurfaceConfiguration } from "../data/career-pathing-list-surface.server"
import { listTargetRolesForOrg } from "../data/career-pathing.queries.server"
import { CAREER_PATHING_LIST_SURFACE_IDS } from "../data/career-pathing-surface-metadata.shared"
import {
  CareerAspirationUpsertForm,
  TargetRoleCreateForm,
} from "./career-pathing-forms.client"
import type { CareerPathingSectionProps } from "./career-pathing-section-props.shared"

export async function CareerPathingTargetRolesSection({
  organizationId,
  orgSlug,
  isHrmAdmin,
}: CareerPathingSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.careerPathing")

  let targetRoles: Awaited<ReturnType<typeof listTargetRolesForOrg>>
  let employees: Awaited<ReturnType<typeof listActiveEmployeeChoicesForLeave>>

  try {
    ;[targetRoles, employees] = await Promise.all([
      listTargetRolesForOrg(organizationId),
      listActiveEmployeeChoicesForLeave(organizationId),
    ])
  } catch (err) {
    logUnexpectedServerError("career-pathing-target-roles: query failed", err, {
      organizationId,
    })
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("targetRolesTitle")}</CardTitle>
          <CardDescription>{t("targetRolesDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GovernedPatternCListSection
            layout="embedded"
            title=""
            listConfiguration={buildCareerPathingEmbeddedListSurfaceErrorConfiguration({
              columnsId: CAREER_PATHING_LIST_SURFACE_IDS.targetRoles,
              emptyTitle: t("targetRolesEmpty"),
              firstColumn: { id: "employee", header: t("colEmployee") },
            })}
            surfaceKey="hrm:career-pathing:target-roles:error"
            resolveConfiguredPermission={false}
            loadError={{
              variant: "error",
              title: t("targetRolesLoadFailed"),
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const employeeChoices = employees.map((employee) => ({
    id: employee.id,
    label: `${employee.employeeNumber} — ${employee.legalName}`,
  }))

  const listConfiguration = buildTargetRolesListSurfaceConfiguration(targetRoles, {
    title: t("targetRolesTitle"),
    description: t("targetRolesDescription"),
    empty: t("targetRolesEmpty"),
    colEmployee: t("colEmployee"),
    colTarget: t("fieldTargetRole"),
    colSource: t("colSource"),
    colFramework: t("colFramework"),
  })

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("targetRolesTitle")}</CardTitle>
        <CardDescription>{t("targetRolesDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isHrmAdmin ? (
          <CareerAspirationUpsertForm
            organizationId={organizationId}
            orgSlug={orgSlug}
            employees={employeeChoices}
            labels={{
              submit: t("saveAspiration"),
              employee: t("fieldEmployee"),
              preferredRole: t("fieldPreferredRole"),
              mobility: t("fieldMobility"),
              notes: t("fieldNotes"),
            }}
          />
        ) : null}
        {isHrmAdmin ? (
          <TargetRoleCreateForm
            organizationId={organizationId}
            orgSlug={orgSlug}
            employees={employeeChoices}
            labels={{
              submit: t("createTargetRole"),
              employee: t("fieldEmployee"),
              targetRole: t("fieldTargetRole"),
            }}
          />
        ) : null}
        <GovernedPatternCListSection
          title={t("targetRolesTitle")}
          description={t("targetRolesDescription")}
          listConfiguration={listConfiguration}
          surfaceKey="hrm:career-pathing:target-roles"
          layout="embedded"
          resolveConfiguredPermission={false}
        />
      </CardContent>
    </Card>
  )
}
