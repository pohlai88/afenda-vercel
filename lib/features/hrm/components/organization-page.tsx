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
import { canActInOrganization } from "#lib/auth/permission.server"
import { requireOrgSession } from "#lib/tenant"

import {
  ORG_STRUCTURE_DEFAULT_TAB,
  isOrgStructureTab,
} from "../data/org-structure-display.shared"
import {
  listDepartmentsForOrg,
  listJobGradesForOrg,
  listPositionsForOrg,
} from "../data/org-structure.queries.server"

import { OrganizationTabNav } from "./organization-tab-nav"
import {
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

export async function OrganizationPage({
  orgSlug,
  tabParam,
  includeArchivedParam,
}: OrganizationPageProps) {
  const orgSession = await requireOrgSession()
  const [t, isAdmin] = await Promise.all([
    getTranslations("Dashboard.Hrm.organization"),
    canActInOrganization(
      orgSession.userId,
      orgSession.user.role,
      orgSession.organizationId,
      "admin"
    ),
  ])

  const activeTab =
    tabParam && isOrgStructureTab(tabParam)
      ? tabParam
      : ORG_STRUCTURE_DEFAULT_TAB
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

      <OrganizationTabNav
        orgSlug={orgSlug}
        activeTab={activeTab}
        includeArchived={includeArchived}
      />

      {isAdmin && activeTab === "departments" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgDepartmentsTable
            orgSlug={orgSlug}
            includeArchived={includeArchived}
          />
        </Suspense>
      ) : null}

      {isAdmin && activeTab === "grades" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgGradesTable orgSlug={orgSlug} includeArchived={includeArchived} />
        </Suspense>
      ) : null}

      {isAdmin && activeTab === "positions" ? (
        <Suspense fallback={<Skeleton className="h-48 w-full rounded-lg" />}>
          <OrgPositionsTable
            orgSlug={orgSlug}
            includeArchived={includeArchived}
          />
        </Suspense>
      ) : null}
    </div>
  )
}

async function OrgDepartmentsTable({
  orgSlug,
  includeArchived,
}: {
  orgSlug: string
  includeArchived: boolean
}) {
  const { organizationId } = await requireOrgSession()
  const [rows, t] = await Promise.all([
    listDepartmentsForOrg(organizationId, { includeArchived }),
    getTranslations("Dashboard.Hrm.organization.departments"),
  ])
  const parentChoices = rows
    .filter((r) => !r.archivedAt)
    .map((r) => ({ id: r.id, label: `${r.code} — ${r.name}` }))

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("tableTitle")}</CardTitle>
        <CardDescription>{t("tableDescription")}</CardDescription>
        <CardAction>
          <OrganizationDepartmentCreateDialog
            orgSlug={orgSlug}
            parentChoices={parentChoices}
          />
        </CardAction>
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
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-end">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    {row.archivedAt ? t("statusArchived") : t("statusActive")}
                  </TableCell>
                  <TableCell className="text-end">
                    {!row.archivedAt ? (
                      <OrganizationDepartmentArchiveForm
                        orgSlug={orgSlug}
                        departmentId={row.id}
                      />
                    ) : (
                      "—"
                    )}
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

async function OrgGradesTable({
  orgSlug,
  includeArchived,
}: {
  orgSlug: string
  includeArchived: boolean
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
        <CardAction>
          <OrganizationJobGradeCreateDialog orgSlug={orgSlug} />
        </CardAction>
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
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-end">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    {row.archivedAt ? t("statusArchived") : t("statusActive")}
                  </TableCell>
                  <TableCell className="text-end">
                    {!row.archivedAt ? (
                      <OrganizationJobGradeArchiveForm
                        orgSlug={orgSlug}
                        gradeId={row.id}
                      />
                    ) : (
                      "—"
                    )}
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

async function OrgPositionsTable({
  orgSlug,
  includeArchived,
}: {
  orgSlug: string
  includeArchived: boolean
}) {
  const { organizationId } = await requireOrgSession()
  const [positions, departments, grades, t] = await Promise.all([
    listPositionsForOrg(organizationId, { includeArchived }),
    listDepartmentsForOrg(organizationId, { includeArchived: false }),
    listJobGradesForOrg(organizationId, { includeArchived: false }),
    getTranslations("Dashboard.Hrm.organization.positions"),
  ])

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("tableTitle")}</CardTitle>
        <CardDescription>{t("tableDescription")}</CardDescription>
        <CardAction>
          <OrganizationPositionCreateDialog
            orgSlug={orgSlug}
            departments={departments}
            grades={grades}
          />
        </CardAction>
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
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead className="text-end">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {positions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.departmentCode ?? "—"}
                  </TableCell>
                  <TableCell>
                    {row.archivedAt ? t("statusArchived") : t("statusActive")}
                  </TableCell>
                  <TableCell className="text-end">
                    {!row.archivedAt ? (
                      <OrganizationPositionArchiveForm
                        orgSlug={orgSlug}
                        positionId={row.id}
                      />
                    ) : (
                      "—"
                    )}
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
