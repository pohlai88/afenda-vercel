import { getTranslations } from "next-intl/server"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"

import type { OrgStructureSurfaceCapabilities } from "../data/org-structure-capabilities.shared"
import {
  buildOrgAssignmentsListSurfaceConfiguration,
  buildOrgHealthIssuesListSurfaceConfiguration,
  buildOrgJobGradesListSurfaceConfiguration,
  buildOrgPositionsListSurfaceConfiguration,
  buildOrgReportingListSurfaceConfiguration,
  buildOrgUnitsListSurfaceConfiguration,
} from "../data/org-structure-list-surface.server"
import type {
  JobGradeListRow,
  OrgStructureEmployeePlacementRow,
  OrgStructureHealthIssue,
  OrgUnitTreeRow,
  PositionListRow,
} from "../data/org-structure.queries.server"

import {
  OrganizationDepartmentArchiveForm,
  OrganizationJobGradeArchiveForm,
  OrganizationPositionArchiveForm,
} from "./organization-structure-forms"

function orgStructureTrailingListContext(
  capabilities: OrgStructureSurfaceCapabilities
) {
  const showActionsColumn = capabilities.canCreate || capabilities.canDelete
  return {
    canDelete: capabilities.canDelete,
    showActionsColumn,
  }
}

type OrganizationGradesListSectionProps = {
  orgSlug: string
  rows: readonly JobGradeListRow[]
  capabilities: OrgStructureSurfaceCapabilities
}

export async function OrganizationGradesListSection({
  orgSlug,
  rows,
  capabilities,
}: OrganizationGradesListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.organization.grades")
  const trailingContext = orgStructureTrailingListContext(capabilities)
  const listConfiguration = buildOrgJobGradesListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colCode: t("colCode"),
      colName: t("colName"),
      colOrdinal: t("colOrdinal"),
      colSalaryBand: t("colSalaryBand"),
      colBenefitTier: t("colBenefitTier"),
      colStatus: t("colStatus"),
      statusActive: t("statusActive"),
      statusArchived: t("statusArchived"),
    },
    trailingContext
  )
  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:organization:grades"
      trailingColumn={
        trailingContext.showActionsColumn
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const row = rowById.get(surfaceRow.id)
                if (
                  row &&
                  isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return (
                    <GovernedTrailingActionSlot trailingAction={trailingAction}>
                      <OrganizationJobGradeArchiveForm
                        orgSlug={orgSlug}
                        gradeId={row.id}
                      />
                    </GovernedTrailingActionSlot>
                  )
                }
                return <span className="text-muted-foreground">—</span>
              },
            }
          : undefined
      }
    />
  )
}

type OrganizationPositionsListSectionProps = {
  orgSlug: string
  rows: readonly PositionListRow[]
  capabilities: OrgStructureSurfaceCapabilities
}

export async function OrganizationPositionsListSection({
  orgSlug,
  rows,
  capabilities,
}: OrganizationPositionsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.organization.positions")
  const trailingContext = orgStructureTrailingListContext(capabilities)
  const listConfiguration = buildOrgPositionsListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colCode: t("colCode"),
      colTitle: t("colTitle"),
      colDepartment: t("colDepartment"),
      colReportsTo: t("colReportsTo"),
      colGrade: t("colGrade"),
      colBudget: t("colBudget"),
      colOccupied: t("colOccupied"),
      colStatus: t("colStatus"),
      occupancyLabel: (state) => t(`occupancy.${state}` as never),
      statusArchived: t("statusArchived"),
    },
    trailingContext
  )
  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:organization:positions"
      trailingColumn={
        trailingContext.showActionsColumn
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const row = rowById.get(surfaceRow.id)
                if (
                  row &&
                  isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return (
                    <GovernedTrailingActionSlot trailingAction={trailingAction}>
                      <OrganizationPositionArchiveForm
                        orgSlug={orgSlug}
                        positionId={row.id}
                      />
                    </GovernedTrailingActionSlot>
                  )
                }
                return <span className="text-muted-foreground">—</span>
              },
            }
          : undefined
      }
    />
  )
}

type OrganizationAssignmentsListSectionProps = {
  rows: readonly OrgStructureEmployeePlacementRow[]
}

export async function OrganizationAssignmentsListSection({
  rows,
}: OrganizationAssignmentsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.organization.assignments")
  const listConfiguration = buildOrgAssignmentsListSurfaceConfiguration(rows, {
    empty: t("empty"),
    colEmployee: t("colEmployee"),
    colDepartment: t("colDepartment"),
    colPosition: t("colPosition"),
    colGrade: t("colGrade"),
    colManager: t("colManager"),
  })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:organization:assignments"
    />
  )
}

type OrganizationOrgUnitsListSectionProps = {
  orgSlug: string
  rows: readonly OrgUnitTreeRow[]
  capabilities: OrgStructureSurfaceCapabilities
}

export async function OrganizationOrgUnitsListSection({
  orgSlug,
  rows,
  capabilities,
}: OrganizationOrgUnitsListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.organization.orgUnits")
  const trailingContext = orgStructureTrailingListContext(capabilities)
  const listConfiguration = buildOrgUnitsListSurfaceConfiguration(
    rows,
    {
      empty: t("empty"),
      colCode: t("colCode"),
      colName: t("colName"),
      colParent: t("colParent"),
      colHead: t("colHead"),
      colCostCenter: t("colCostCenter"),
      colPositions: t("colPositions"),
      colEmployees: t("colEmployees"),
      colStatus: t("colStatus"),
      statusActive: t("statusActive"),
      statusArchived: t("statusArchived"),
    },
    trailingContext
  )
  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:organization:org-units"
      trailingColumn={
        trailingContext.showActionsColumn
          ? {
              header: t("colActions"),
              render: (surfaceRow) => {
                const trailingAction = surfaceRow.trailingAction
                const row = rowById.get(surfaceRow.id)
                if (
                  row &&
                  isListSurfaceTrailingActionRenderable(trailingAction)
                ) {
                  return (
                    <GovernedTrailingActionSlot trailingAction={trailingAction}>
                      <OrganizationDepartmentArchiveForm
                        orgSlug={orgSlug}
                        departmentId={row.id}
                      />
                    </GovernedTrailingActionSlot>
                  )
                }
                return <span className="text-muted-foreground">—</span>
              },
            }
          : undefined
      }
    />
  )
}

type OrganizationReportingListSectionProps = {
  rows: readonly PositionListRow[]
}

export async function OrganizationReportingListSection({
  rows,
}: OrganizationReportingListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.organization.reporting")
  const listConfiguration = buildOrgReportingListSurfaceConfiguration(rows, {
    empty: t("empty"),
    colPosition: t("colPosition"),
    colReportsTo: t("colReportsTo"),
    colDepartment: t("colDepartment"),
    colOccupied: t("colOccupied"),
  })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:organization:reporting"
    />
  )
}

type OrganizationHealthIssuesListSectionProps = {
  rows: readonly OrgStructureHealthIssue[]
}

export async function OrganizationHealthIssuesListSection({
  rows,
}: OrganizationHealthIssuesListSectionProps) {
  const t = await getTranslations("Dashboard.Hrm.organization.health")
  const listConfiguration = buildOrgHealthIssuesListSurfaceConfiguration(rows, {
    empty: t("empty"),
    colSeverity: t("colSeverity"),
    colIssue: t("colIssue"),
    colDetail: t("colDetail"),
    severityLabel: (severity) => severity.toUpperCase(),
  })

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:organization:health"
    />
  )
}
