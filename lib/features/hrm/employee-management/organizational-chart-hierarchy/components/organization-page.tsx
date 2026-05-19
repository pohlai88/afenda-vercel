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
import {
  OrganizationAssignmentsListSection,
  OrganizationGradesListSection,
  OrganizationOrgUnitsListSection,
  OrganizationHealthIssuesListSection,
  OrganizationPositionsListSection,
  OrganizationReportingListSection,
} from "./organization-structure-list-sections"
import { requireOrgSession } from "#lib/auth"

import { normalizeOrgStructureTab } from "../data/org-structure-display.shared"
import type { OrgStructureSurfaceCapabilities } from "../data/org-structure-capabilities.shared"
import { resolveOrgStructureSurfaceCapabilities } from "../data/org-structure-capabilities.server"
import {
  listJobGradesForOrg,
  listOrgStructureEmployeePlacements,
  listOrgStructureSnapshot,
  listOrgUnitTree,
  listPositionControlRows,
} from "../data/org-structure.queries.server"

import { OrgChartPanel } from "./org-chart-panel"
import { OrganizationTabNav } from "./organization-tab-nav"
import {
  OrganizationAssignmentDialog,
  OrganizationDepartmentCreateDialog,
  OrganizationJobGradeCreateDialog,
  OrganizationPositionCreateDialog,
} from "./organization-structure-forms"

type OrganizationPageProps = {
  orgSlug: string
  tabParam?: string
  includeArchivedParam?: string
}

type Choice = { readonly id: string; readonly label: string }

export async function OrganizationPage({
  orgSlug,
  tabParam,
  includeArchivedParam,
}: OrganizationPageProps) {
  await requireOrgSession()
  const [t, capabilities] = await Promise.all([
    getTranslations("Dashboard.Hrm.organization"),
    resolveOrgStructureSurfaceCapabilities(),
  ])
  const canAnyMutate =
    capabilities.canCreate || capabilities.canUpdate || capabilities.canDelete

  const activeTab = normalizeOrgStructureTab(tabParam)
  const includeArchived = includeArchivedParam === "true"

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      {!canAnyMutate ? (
        <Card size="sm">
          <CardHeader>
            <CardTitle>{t("memberRestrictedTitle")}</CardTitle>
            <CardDescription>{t("memberRestrictedBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <OrganizationTabNav
        orgSlug={orgSlug}
        activeTab={activeTab}
        includeArchived={includeArchived}
      />

      {activeTab === "overview" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgOverviewPanel />
        </Suspense>
      ) : null}

      {activeTab === "chart" ? (
        <Suspense
          fallback={<Skeleton className="h-[32rem] w-full rounded-lg" />}
        >
          <OrgChartPanel
            orgSlug={orgSlug}
            includeArchived={includeArchived}
            capabilities={capabilities}
          />
        </Suspense>
      ) : null}

      {activeTab === "org-units" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgUnitsTable
            orgSlug={orgSlug}
            includeArchived={includeArchived}
            capabilities={capabilities}
          />
        </Suspense>
      ) : null}

      {activeTab === "grades" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgGradesTable
            orgSlug={orgSlug}
            includeArchived={includeArchived}
            capabilities={capabilities}
          />
        </Suspense>
      ) : null}

      {activeTab === "positions" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgPositionsTable
            orgSlug={orgSlug}
            includeArchived={includeArchived}
            capabilities={capabilities}
          />
        </Suspense>
      ) : null}

      {activeTab === "assignments" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgAssignmentsTable orgSlug={orgSlug} capabilities={capabilities} />
        </Suspense>
      ) : null}

      {activeTab === "reporting" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgReportingTable includeArchived={includeArchived} />
        </Suspense>
      ) : null}

      {activeTab === "health" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgHealthPanel />
        </Suspense>
      ) : null}
    </div>
  )
}

async function OrgOverviewPanel() {
  const { organizationId } = await requireOrgSession()
  const [snapshot, t] = await Promise.all([
    listOrgStructureSnapshot(organizationId),
    getTranslations("Dashboard.Hrm.organization.overview"),
  ])

  const stats = [
    { label: t("statOrgUnits"), value: snapshot.totals.activeOrgUnits },
    { label: t("statPositions"), value: snapshot.totals.activePositions },
    { label: t("statEmployees"), value: snapshot.totals.activeEmployees },
    { label: t("statBudget"), value: snapshot.totals.budgetedHeadcount },
    { label: t("statOccupied"), value: snapshot.totals.occupiedHeadcount },
    { label: t("statOpen"), value: snapshot.totals.openHeadcount },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("tableTitle")}</CardTitle>
          <CardDescription>{t("tableDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="border border-border p-3">
                <div className="text-xs text-muted-foreground">
                  {stat.label}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("healthTitle")}</CardTitle>
          <CardDescription>{t("healthDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshot.health.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("healthEmpty")}</p>
          ) : (
            <ul className="space-y-3">
              {snapshot.health.slice(0, 5).map((issue) => (
                <li key={issue.id} className="border-l-2 border-border pl-3">
                  <div className="text-sm font-medium">{issue.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {issue.detail}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function OrgUnitsTable({
  orgSlug,
  includeArchived,
  capabilities,
}: {
  orgSlug: string
  includeArchived: boolean
  capabilities: OrgStructureSurfaceCapabilities
}) {
  const { organizationId } = await requireOrgSession()
  const [rows, t] = await Promise.all([
    listOrgUnitTree(organizationId, { includeArchived }),
    getTranslations("Dashboard.Hrm.organization.orgUnits"),
  ])
  const parentChoices = rows
    .filter((r) => !r.archivedAt)
    .map((r) => ({ id: r.id, label: `${r.code} - ${r.name}` }))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("tableTitle")}</CardTitle>
        <CardDescription>{t("tableDescription")}</CardDescription>
        {capabilities.canCreate ? (
          <CardAction>
            <OrganizationDepartmentCreateDialog
              orgSlug={orgSlug}
              parentChoices={parentChoices}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <OrganizationOrgUnitsListSection
          orgSlug={orgSlug}
          rows={rows}
          capabilities={capabilities}
        />
      </CardContent>
    </Card>
  )
}

async function OrgGradesTable({
  orgSlug,
  includeArchived,
  capabilities,
}: {
  orgSlug: string
  includeArchived: boolean
  capabilities: OrgStructureSurfaceCapabilities
}) {
  const { organizationId } = await requireOrgSession()
  const [rows, t] = await Promise.all([
    listJobGradesForOrg(organizationId, { includeArchived }),
    getTranslations("Dashboard.Hrm.organization.grades"),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("tableTitle")}</CardTitle>
        <CardDescription>{t("tableDescription")}</CardDescription>
        {capabilities.canCreate ? (
          <CardAction>
            <OrganizationJobGradeCreateDialog orgSlug={orgSlug} />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <OrganizationGradesListSection
          orgSlug={orgSlug}
          rows={rows}
          capabilities={capabilities}
        />
      </CardContent>
    </Card>
  )
}

async function OrgPositionsTable({
  orgSlug,
  includeArchived,
  capabilities,
}: {
  orgSlug: string
  includeArchived: boolean
  capabilities: OrgStructureSurfaceCapabilities
}) {
  const { organizationId } = await requireOrgSession()
  const [positions, departments, grades, t] = await Promise.all([
    listPositionControlRows(organizationId, { includeArchived }),
    listOrgUnitTree(organizationId, { includeArchived: false }),
    listJobGradesForOrg(organizationId, { includeArchived: false }),
    getTranslations("Dashboard.Hrm.organization.positions"),
  ])
  const departmentChoices = departments.filter((d) => !d.archivedAt)
  const positionChoices: Choice[] = positions
    .filter((p) => !p.archivedAt)
    .map((p) => ({ id: p.id, label: `${p.code} - ${p.title}` }))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("tableTitle")}</CardTitle>
        <CardDescription>{t("tableDescription")}</CardDescription>
        {capabilities.canCreate ? (
          <CardAction>
            <OrganizationPositionCreateDialog
              orgSlug={orgSlug}
              departments={departmentChoices}
              grades={grades}
              positions={positionChoices}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <OrganizationPositionsListSection
          orgSlug={orgSlug}
          rows={positions}
          capabilities={capabilities}
        />
      </CardContent>
    </Card>
  )
}

async function OrgAssignmentsTable({
  orgSlug,
  capabilities,
}: {
  orgSlug: string
  capabilities: OrgStructureSurfaceCapabilities
}) {
  const { organizationId } = await requireOrgSession()
  const [rows, orgUnits, positions, grades, t] = await Promise.all([
    listOrgStructureEmployeePlacements(organizationId),
    listOrgUnitTree(organizationId, { includeArchived: false }),
    listPositionControlRows(organizationId, { includeArchived: false }),
    listJobGradesForOrg(organizationId, { includeArchived: false }),
    getTranslations("Dashboard.Hrm.organization.assignments"),
  ])
  const employeeChoices = rows.map((row) => ({ id: row.id, label: row.label }))
  const departmentChoices = orgUnits.map((row) => ({
    id: row.id,
    label: `${row.code} - ${row.name}`,
  }))
  const positionChoices = positions.map((row) => ({
    id: row.id,
    label: `${row.code} - ${row.title}`,
  }))
  const gradeChoices = grades.map((row) => ({
    id: row.id,
    label: `${row.code} - ${row.name}`,
  }))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("tableTitle")}</CardTitle>
        <CardDescription>{t("tableDescription")}</CardDescription>
        {capabilities.canUpdate ? (
          <CardAction>
            <OrganizationAssignmentDialog
              orgSlug={orgSlug}
              employees={employeeChoices}
              departments={departmentChoices}
              positions={positionChoices}
              grades={gradeChoices}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <OrganizationAssignmentsListSection rows={rows} />
      </CardContent>
    </Card>
  )
}

async function OrgReportingTable({
  includeArchived,
}: {
  includeArchived: boolean
}) {
  const { organizationId } = await requireOrgSession()
  const [positions, t] = await Promise.all([
    listPositionControlRows(organizationId, { includeArchived }),
    getTranslations("Dashboard.Hrm.organization.reporting"),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("tableTitle")}</CardTitle>
        <CardDescription>{t("tableDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <OrganizationReportingListSection rows={positions} />
      </CardContent>
    </Card>
  )
}

async function OrgHealthPanel() {
  const { organizationId } = await requireOrgSession()
  const [snapshot, t] = await Promise.all([
    listOrgStructureSnapshot(organizationId),
    getTranslations("Dashboard.Hrm.organization.health"),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("tableTitle")}</CardTitle>
        <CardDescription>{t("tableDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <OrganizationHealthIssuesListSection rows={snapshot.health} />
      </CardContent>
    </Card>
  )
}
