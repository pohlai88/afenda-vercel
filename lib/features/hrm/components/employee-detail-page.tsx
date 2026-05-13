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
import { Input } from "#components/ui/input"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import { Separator } from "#components/ui/separator"
import { requireOrgSession } from "#lib/tenant"

import {
  submitArchiveDependent,
  submitCreateDependent,
} from "../actions/dependent.actions"
import { organizationHrmPath } from "../constants"
import { listDependentsForEmployee } from "../data/dependent.queries.server"
import { listEmployeeChangeHistory } from "../data/employee-change-history.queries.server"
import { getEmployeeForOrganization } from "../data/employee.queries.server"
import { listEmployeeIamAuditTimeline } from "../data/employee-timeline.queries.server"
import { HRM_DEPENDENT_RELATIONSHIPS } from "../schemas/dependent.schema"

const DEPENDENT_RELATIONSHIP_MESSAGE_KEY = {
  spouse: "dependentRelationships.spouse",
  child: "dependentRelationships.child",
  parent: "dependentRelationships.parent",
  other: "dependentRelationships.other",
} as const

import { EmployeeArchiveForm } from "./employee-archive-form"
import { EmployeeDetailPayrollContract } from "./employee-detail-payroll-contract"
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
  const [employee, timelineRows, dependents, changeHistory] = await Promise.all([
    getEmployeeForOrganization(organizationId, idParsed.data),
    listEmployeeIamAuditTimeline({
      organizationId,
      employeeId: idParsed.data,
    }),
    listDependentsForEmployee(organizationId, idParsed.data),
    listEmployeeChangeHistory({
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

      <EmployeeDetailPayrollContract
        orgSlug={orgSlug}
        organizationId={organizationId}
        employeeId={employee.id}
        archivedAt={employee.archivedAt}
      />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("dependentsSectionTitle")}</CardTitle>
          <CardDescription>{t("dependentsSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {dependents.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("dependentsEmpty")}</p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {dependents.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{d.legalName}</p>
                    <p className="text-muted-foreground text-xs">
                      {t(DEPENDENT_RELATIONSHIP_MESSAGE_KEY[relationshipKey(d.relationship)])}{" "}
                      ·{" "}
                      {d.dateOfBirth
                        ? format.dateTime(d.dateOfBirth, { dateStyle: "medium" })
                        : "—"}{" "}
                      ·{" "}
                      {d.taxDependent ? t("dependentTaxYes") : t("dependentTaxNo")}
                    </p>
                  </div>
                  {!employee.archivedAt ? (
                    <form action={submitArchiveDependent}>
                      <input type="hidden" name="orgSlug" value={orgSlug} />
                      <input type="hidden" name="dependentId" value={d.id} />
                      <Button type="submit" variant="outline" size="sm">
                        {t("dependentArchiveSubmit")}
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}

          {!employee.archivedAt ? (
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium">{t("dependentAddTitle")}</p>
              <form
                action={submitCreateDependent}
                className="grid max-w-xl gap-3 sm:grid-cols-2"
              >
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <input type="hidden" name="employeeId" value={employee.id} />
                <div className="sm:col-span-2">
                  <label className="text-muted-foreground text-sm" htmlFor="dep-name">
                    {t("dependentLegalNameLabel")}
                  </label>
                  <Input id="dep-name" name="legalName" required className="mt-1" />
                </div>
                <div>
                  <label className="text-muted-foreground text-sm" htmlFor="dep-rel">
                    {t("dependentRelationshipLabel")}
                  </label>
                  <select
                    id="dep-rel"
                    name="relationship"
                    required
                    className="border-input bg-background mt-1 flex h-9 w-full rounded-md border px-3 text-sm"
                  >
                    {HRM_DEPENDENT_RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {t(DEPENDENT_RELATIONSHIP_MESSAGE_KEY[rel])}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground text-sm" htmlFor="dep-dob">
                    {t("dependentDobLabel")}
                  </label>
                  <input
                    id="dep-dob"
                    name="dateOfBirth"
                    type="date"
                    className="border-input bg-background mt-1 flex h-9 w-full rounded-md border px-3 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2 sm:col-span-2">
                  <input
                    id="dep-tax"
                    name="taxDependent"
                    type="checkbox"
                    className="size-4 rounded border border-input"
                  />
                  <label htmlFor="dep-tax" className="text-sm">
                    {t("dependentTaxLabel")}
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" variant="secondary" size="sm">
                    {t("dependentAddSubmit")}
                  </Button>
                </div>
              </form>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("changeHistoryTitle")}</CardTitle>
          <CardDescription>{t("changeHistoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {changeHistory.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("changeHistoryEmpty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="py-2 pr-3 font-medium">{t("changeHistoryColField")}</th>
                    <th className="py-2 pr-3 font-medium">{t("changeHistoryColOld")}</th>
                    <th className="py-2 pr-3 font-medium">{t("changeHistoryColNew")}</th>
                    <th className="py-2 font-medium">{t("changeHistoryColWhen")}</th>
                  </tr>
                </thead>
                <tbody>
                  {changeHistory.map((row) => (
                    <tr key={row.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{row.fieldName}</td>
                      <td className="max-w-[10rem] truncate py-2 pr-3 font-mono text-xs">
                        {serializeChangeValue(row.oldValue)}
                      </td>
                      <td className="max-w-[10rem] truncate py-2 pr-3 font-mono text-xs">
                        {serializeChangeValue(row.newValue)}
                      </td>
                      <td className="py-2 text-muted-foreground text-xs whitespace-nowrap">
                        {format.dateTime(row.changedAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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

function serializeChangeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—"
  }
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 117)}…` : value
  }
  try {
    const serialized = JSON.stringify(value)
    return serialized.length > 120 ? `${serialized.slice(0, 117)}…` : serialized
  } catch {
    return String(value)
  }
}

function relationshipKey(
  value: string
): keyof typeof DEPENDENT_RELATIONSHIP_MESSAGE_KEY {
  if (value === "spouse" || value === "child" || value === "parent" || value === "other") {
    return value
  }
  return "other"
}
