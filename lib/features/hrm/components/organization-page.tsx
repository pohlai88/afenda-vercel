import { Suspense } from "react"
import { getTranslations } from "next-intl/server"

import { ModulePageHeader } from "#components/module-page-header"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Skeleton } from "#components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { requireOrgSession } from "#lib/tenant"

import { normalizeOrgStructureTab } from "../data/org-structure-display.shared"
import {
  listJobGradesForOrg,
  listOrgStructureEmployeePlacements,
  listOrgStructureSnapshot,
  listOrgUnitTree,
  listPositionControlRows,
} from "../data/org-structure.queries.server"

import { OrganizationTabNav } from "./organization-tab-nav"
import {
  OrganizationAssignmentDialog,
  OrganizationDepartmentArchiveForm,
  OrganizationDepartmentCreateDialog,
  OrganizationJobGradeArchiveForm,
  OrganizationJobGradeCreateDialog,
  OrganizationPositionArchiveForm,
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
  const [t, canMutate] = await Promise.all([
    getTranslations("Dashboard.Hrm.organization"),
    canUseErpPermissionForCurrentOrg({
      module: "hrm",
      object: "organization",
      function: "update",
    }),
  ])

  const activeTab = normalizeOrgStructureTab(tabParam)
  const includeArchived = includeArchivedParam === "true"

  return (
    <div className="flex flex-col gap-6 p-6">
      <ModulePageHeader
        eyebrow={t("eyebrow")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      {!canMutate ? (
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

      {activeTab === "org-units" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgUnitsTable
            orgSlug={orgSlug}
            includeArchived={includeArchived}
            canMutate={canMutate}
          />
        </Suspense>
      ) : null}

      {activeTab === "grades" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgGradesTable
            orgSlug={orgSlug}
            includeArchived={includeArchived}
            canMutate={canMutate}
          />
        </Suspense>
      ) : null}

      {activeTab === "positions" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgPositionsTable
            orgSlug={orgSlug}
            includeArchived={includeArchived}
            canMutate={canMutate}
          />
        </Suspense>
      ) : null}

      {activeTab === "assignments" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgAssignmentsTable orgSlug={orgSlug} canMutate={canMutate} />
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
  canMutate,
}: {
  orgSlug: string
  includeArchived: boolean
  canMutate: boolean
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
        {canMutate ? (
          <CardAction>
            <OrganizationDepartmentCreateDialog
              orgSlug={orgSlug}
              parentChoices={parentChoices}
            />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colCode")}</TableHead>
                <TableHead>{t("colName")}</TableHead>
                <TableHead>{t("colParent")}</TableHead>
                <TableHead>{t("colHead")}</TableHead>
                <TableHead>{t("colCostCenter")}</TableHead>
                <TableHead className="text-end">{t("colPositions")}</TableHead>
                <TableHead className="text-end">{t("colEmployees")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                {canMutate ? (
                  <TableHead className="text-end">{t("colActions")}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.parentCode)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.headEmployeeLabel)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {dash(row.costCenterCode)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {row.activePositionCount}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {row.activeEmployeeCount}
                  </TableCell>
                  <TableCell>
                    {row.archivedAt ? t("statusArchived") : t("statusActive")}
                  </TableCell>
                  {canMutate ? (
                    <TableCell className="text-end">
                      {!row.archivedAt ? (
                        <OrganizationDepartmentArchiveForm
                          orgSlug={orgSlug}
                          departmentId={row.id}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

async function OrgGradesTable({
  orgSlug,
  includeArchived,
  canMutate,
}: {
  orgSlug: string
  includeArchived: boolean
  canMutate: boolean
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
        {canMutate ? (
          <CardAction>
            <OrganizationJobGradeCreateDialog orgSlug={orgSlug} />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colCode")}</TableHead>
                <TableHead>{t("colName")}</TableHead>
                <TableHead className="text-end">{t("colOrdinal")}</TableHead>
                <TableHead>{t("colSalaryBand")}</TableHead>
                <TableHead>{t("colBenefitTier")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                {canMutate ? (
                  <TableHead className="text-end">{t("colActions")}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {row.ordinal}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {salaryBand(row)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {dash(row.benefitTierCode)}
                  </TableCell>
                  <TableCell>
                    {row.archivedAt ? t("statusArchived") : t("statusActive")}
                  </TableCell>
                  {canMutate ? (
                    <TableCell className="text-end">
                      {!row.archivedAt ? (
                        <OrganizationJobGradeArchiveForm
                          orgSlug={orgSlug}
                          gradeId={row.id}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

async function OrgPositionsTable({
  orgSlug,
  includeArchived,
  canMutate,
}: {
  orgSlug: string
  includeArchived: boolean
  canMutate: boolean
}) {
  const { organizationId } = await requireOrgSession()
  const [positions, departments, grades, t] = await Promise.all([
    listPositionControlRows(organizationId, { includeArchived }),
    listOrgUnitTree(organizationId, { includeArchived: false }),
    listJobGradesForOrg(organizationId, { includeArchived: false }),
    getTranslations("Dashboard.Hrm.organization.positions"),
  ])
  const departmentChoices = departments.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    parentDepartmentId: d.parentDepartmentId,
    headEmployeeId: d.headEmployeeId,
    costCenterCode: d.costCenterCode,
    archivedAt: d.archivedAt,
  }))
  const positionChoices: Choice[] = positions
    .filter((p) => !p.archivedAt)
    .map((p) => ({ id: p.id, label: `${p.code} - ${p.title}` }))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("tableTitle")}</CardTitle>
        <CardDescription>{t("tableDescription")}</CardDescription>
        {canMutate ? (
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
        {positions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colCode")}</TableHead>
                <TableHead>{t("colTitle")}</TableHead>
                <TableHead>{t("colDepartment")}</TableHead>
                <TableHead>{t("colReportsTo")}</TableHead>
                <TableHead>{t("colGrade")}</TableHead>
                <TableHead className="text-end">{t("colBudget")}</TableHead>
                <TableHead className="text-end">{t("colOccupied")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                {canMutate ? (
                  <TableHead className="text-end">{t("colActions")}</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.departmentCode)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.reportsToPositionCode)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.defaultGradeCode)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {row.headcountBudget ?? "-"}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {row.occupancyCount}
                  </TableCell>
                  <TableCell>
                    {row.archivedAt
                      ? t("statusArchived")
                      : t(`occupancy.${row.occupancyState}`)}
                  </TableCell>
                  {canMutate ? (
                    <TableCell className="text-end">
                      {!row.archivedAt ? (
                        <OrganizationPositionArchiveForm
                          orgSlug={orgSlug}
                          positionId={row.id}
                        />
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

async function OrgAssignmentsTable({
  orgSlug,
  canMutate,
}: {
  orgSlug: string
  canMutate: boolean
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
        {canMutate ? (
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
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colEmployee")}</TableHead>
                <TableHead>{t("colDepartment")}</TableHead>
                <TableHead>{t("colPosition")}</TableHead>
                <TableHead>{t("colGrade")}</TableHead>
                <TableHead>{t("colManager")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.departmentCode)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.positionCode)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.jobGradeCode)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.managerLabel)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
        {positions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colPosition")}</TableHead>
                <TableHead>{t("colReportsTo")}</TableHead>
                <TableHead>{t("colDepartment")}</TableHead>
                <TableHead className="text-end">{t("colOccupied")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {row.code} - {row.title}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.reportsToPositionCode)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dash(row.departmentCode)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {row.occupancyCount}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
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
        {snapshot.health.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colSeverity")}</TableHead>
                <TableHead>{t("colIssue")}</TableHead>
                <TableHead>{t("colDetail")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.health.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell className="font-mono text-xs uppercase">
                    {issue.severity}
                  </TableCell>
                  <TableCell className="font-medium">{issue.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {issue.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function dash(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "-"
}

function salaryBand(row: {
  minSalaryAmount: string | null
  maxSalaryAmount: string | null
  currency: string
}): string {
  if (!row.minSalaryAmount && !row.maxSalaryAmount) return "-"
  return `${row.currency} ${row.minSalaryAmount ?? "0"} - ${
    row.maxSalaryAmount ?? "open"
  }`
}
