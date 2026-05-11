import { getTranslations } from "next-intl/server"

import { Link } from "#i18n/navigation"
import type { Route } from "next"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "#components/ui/card"
import { ModulePageHeader } from "#components/module-page-header"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { Badge } from "#components/ui/badge"
import { requireOrgSession } from "#lib/tenant"

import { organizationHrmEmployeePath } from "../constants"
import { listEmployeesForOrganization } from "../data/employee.queries.server"

import { AddEmployeeDialog } from "./add-employee-dialog"

type WorkforcePageProps = {
  orgSlug: string
}

export async function WorkforcePage({ orgSlug }: WorkforcePageProps) {
  const { organizationId } = await requireOrgSession()
  const [rows, t] = await Promise.all([
    listEmployeesForOrganization(organizationId),
    getTranslations("Dashboard.Hrm.workforce"),
  ])

  return (
    <div className="flex flex-col gap-6">
      <ModulePageHeader
        eyebrow={t("pageTitle")}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("directoryTitle")}</CardTitle>
          <CardDescription>{t("directoryDescription")}</CardDescription>
          <CardAction>
            <AddEmployeeDialog orgSlug={orgSlug} />
          </CardAction>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("colNumber")}</TableHead>
                  <TableHead>{t("colName")}</TableHead>
                  <TableHead>{t("colEmail")}</TableHead>
                  <TableHead>{t("colStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={
                          organizationHrmEmployeePath(orgSlug, row.id) as Route
                        }
                        className="text-primary hover:underline"
                      >
                        {row.employeeNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{row.legalName}</span>
                        {row.preferredName ? (
                          <span className="text-xs text-muted-foreground">
                            {row.preferredName}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {row.archivedAt ? (
                        <Badge variant="secondary">{t("statusArchived")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("statusActive")}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
