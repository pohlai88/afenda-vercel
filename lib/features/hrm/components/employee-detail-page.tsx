import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"
import { z } from "zod"

import type { Route } from "next"

import { Link } from "#i18n/navigation"
import { ModulePageHeader } from "#components/module-page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Badge } from "#components/ui/badge"
import { Separator } from "#components/ui/separator"
import { requireOrgSession } from "#lib/tenant"

import { organizationHrmPath } from "../constants"
import { getEmployeeForOrganization } from "../data/employee.queries.server"
import { listEmployeeIamAuditTimeline } from "../data/employee-timeline.queries.server"

import { EmployeeArchiveForm } from "./employee-archive-form"
import { EmployeeDetailPhase1b } from "./employee-detail-phase1b"
import { EmployeeEditForm } from "./employee-edit-form"
import { EmployeeTimeline } from "./employee-timeline"

type EmployeeDetailPageProps = {
  orgSlug: string
  employeeId: string
}

export async function EmployeeDetailPage({
  orgSlug,
  employeeId,
}: EmployeeDetailPageProps) {
  const idParsed = z.string().uuid().safeParse(employeeId)
  if (!idParsed.success) {
    notFound()
  }

  const { organizationId } = await requireOrgSession()
  const [employee, timelineRows] = await Promise.all([
    getEmployeeForOrganization(organizationId, idParsed.data),
    listEmployeeIamAuditTimeline({
      organizationId,
      employeeId: idParsed.data,
    }),
  ])
  if (!employee) {
    notFound()
  }

  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.workforce"),
    getFormatter(),
  ])

  const listHref = organizationHrmPath(orgSlug, "employees")
  const updatedLabel = format.dateTime(employee.updatedAt, {
    dateStyle: "medium",
    timeStyle: "short",
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          href={listHref as Route}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("backToWorkforce")}
        </Link>
        <ModulePageHeader
          eyebrow={t("pageTitle")}
          title={t("detailTitle")}
          description={t("detailDescription")}
        />
      </div>

      <Card size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">
              {employee.employeeNumber}
            </CardTitle>
            {employee.archivedAt ? (
              <Badge variant="secondary">{t("statusArchived")}</Badge>
            ) : (
              <Badge variant="outline">{t("statusActive")}</Badge>
            )}
          </div>
          <CardDescription>{t("summarySectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">{t("fieldLegalName")}</dt>
              <dd className="font-medium">{employee.legalName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("fieldPreferredName")}
              </dt>
              <dd>{employee.preferredName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("fieldEmail")}</dt>
              <dd>{employee.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("detailPhone")}</dt>
              <dd>{employee.phone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("detailUpdated")}</dt>
              <dd>{updatedLabel}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {t("fieldDepartmentId")}
              </dt>
              <dd className="font-mono text-xs">
                {employee.currentDepartmentId ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">{t("fieldPositionId")}</dt>
              <dd className="font-mono text-xs">
                {employee.currentPositionId ?? "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">{t("fieldJobGradeId")}</dt>
              <dd className="font-mono text-xs">
                {employee.currentJobGradeId ?? "—"}
              </dd>
            </div>
          </dl>
          {employee.archivedAt && employee.archivedReason ? (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t("detailArchiveReason")}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {employee.archivedReason}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <EmployeeDetailPhase1b
        orgSlug={orgSlug}
        organizationId={organizationId}
        employeeId={employee.id}
        archivedAt={employee.archivedAt}
      />

      {!employee.archivedAt ? (
        <>
          <Separator />

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{t("editTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeEditForm orgSlug={orgSlug} employee={employee} />
            </CardContent>
          </Card>

          <Separator />

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-base">{t("archiveTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <EmployeeArchiveForm orgSlug={orgSlug} employeeId={employee.id} />
            </CardContent>
          </Card>
        </>
      ) : null}

      <EmployeeTimeline rows={timelineRows} />
    </div>
  )
}
