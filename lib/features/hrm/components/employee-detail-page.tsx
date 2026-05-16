import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"
import { z } from "zod"

import type { Route } from "next"
import type { ReactNode } from "react"

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
import { listEmployeeChangeHistory } from "../data/employee-change-history.queries.server"
import { getEmployeeMasterRecordForOrganization } from "../data/employee-master.queries.server"
import { getEmployeePortalAccessForEmployee } from "../data/employee-portal-access.server"
import { listEmployeeIamAuditTimeline } from "../data/employee-timeline.queries.server"
import { HRM_DEPENDENT_RELATIONSHIPS } from "../schemas/dependent.schema"

const DEPENDENT_RELATIONSHIP_MESSAGE_KEY = {
  spouse: "dependentRelationships.spouse",
  child: "dependentRelationships.child",
  parent: "dependentRelationships.parent",
  other: "dependentRelationships.other",
} as const

import { EmployeeArchiveForm } from "./employee-archive-form"
import { EmployeeDetailBoardingSection } from "./employee-detail-boarding-section"
import { EmployeeDetailPayrollContract } from "./employee-detail-payroll-contract"
import { EmployeeDetailTrainingSection } from "./employee-detail-training-section"
import { EmployeeMasterForms } from "./employee-master-forms"
import { EmployeePortalAccessCard } from "./employee-portal-access-card"
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
  const [snapshot, timelineRows, changeHistory, portalAccess] =
    await Promise.all([
      getEmployeeMasterRecordForOrganization({
        organizationId,
        employeeId: idParsed.data,
      }),
      listEmployeeIamAuditTimeline({
        organizationId,
        employeeId: idParsed.data,
      }),
      listEmployeeChangeHistory({
        organizationId,
        employeeId: idParsed.data,
      }),
      getEmployeePortalAccessForEmployee({
        organizationId,
        employeeId: idParsed.data,
      }),
    ])
  if (!snapshot) {
    notFound()
  }
  const employee = snapshot.employee
  const dependents = snapshot.dependents

  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.workforce"),
    getFormatter(),
  ])

  const listHref = organizationHrmPath(orgSlug, "employees")
  const updatedLabel = format.dateTime(employee.updatedAt, {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const completenessLabel = (key: string) => {
    switch (key) {
      case "identity":
        return t("masterRecord.completeness.identity")
      case "contact":
        return t("masterRecord.completeness.contact")
      case "employment":
        return t("masterRecord.completeness.employment")
      case "statutory":
        return t("masterRecord.completeness.statutory")
      case "documents":
        return t("masterRecord.completeness.documents")
      default:
        return key
    }
  }
  const authorizationStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return t("masterRecord.authorizationStatus.active")
      case "pending":
        return t("masterRecord.authorizationStatus.pending")
      case "expired":
        return t("masterRecord.authorizationStatus.expired")
      case "revoked":
        return t("masterRecord.authorizationStatus.revoked")
      default:
        return status
    }
  }

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
          <div className="flex flex-wrap gap-2">
            {Object.entries(snapshot.completeness).map(([key, complete]) => (
              <Badge key={key} variant={complete ? "outline" : "secondary"}>
                {completenessLabel(key)}:{" "}
                {complete
                  ? t("masterRecord.completenessStatus.ready")
                  : t("masterRecord.completenessStatus.missing")}
              </Badge>
            ))}
          </div>
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
                {t("masterRecord.fields.department")}
              </dt>
              <dd>{placementLabel(snapshot.placementLabels.department)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {t("masterRecord.fields.position")}
              </dt>
              <dd>{placementLabel(snapshot.placementLabels.position)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {t("masterRecord.fields.jobGrade")}
              </dt>
              <dd>{placementLabel(snapshot.placementLabels.jobGrade)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {t("masterRecord.fields.manager")}
              </dt>
              <dd>{placementLabel(snapshot.placementLabels.manager)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {t("masterRecord.fields.linkedUser")}
              </dt>
              <dd>{placementLabel(snapshot.placementLabels.linkedUser)}</dd>
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

      <Card id="identity" size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("masterRecord.cardTitle")}
          </CardTitle>
          <CardDescription>{t("masterRecord.cardDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <nav className="flex flex-wrap gap-2 text-xs">
            {[
              ["#identity", t("masterRecord.nav.identity")],
              ["#employment", t("masterRecord.nav.employment")],
              ["#statutory", t("masterRecord.nav.statutory")],
              ["#dependents", t("masterRecord.nav.dependents")],
              ["#history", t("masterRecord.nav.history")],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="grid gap-4 lg:grid-cols-2">
            <MasterSection title={t("masterRecord.sections.identityProfile")}>
              <MasterValue
                label={t("masterRecord.values.dateOfBirth")}
                value={
                  snapshot.personalProfile?.dateOfBirth
                    ? format.dateTime(snapshot.personalProfile.dateOfBirth, {
                        dateStyle: "medium",
                      })
                    : "—"
                }
              />
              <MasterValue
                label={t("masterRecord.values.nationality")}
                value={snapshot.personalProfile?.nationality ?? "—"}
              />
              <MasterValue
                label={t("masterRecord.values.maritalStatus")}
                value={snapshot.personalProfile?.maritalStatus ?? "—"}
              />
            </MasterSection>
            <MasterSection title={t("masterRecord.sections.contactProfile")}>
              <MasterValue
                label={t("masterRecord.values.workEmail")}
                value={
                  snapshot.contactProfile?.workEmail ?? employee.email ?? "—"
                }
              />
              <MasterValue
                label={t("masterRecord.values.workPhone")}
                value={
                  snapshot.contactProfile?.workPhone ?? employee.phone ?? "—"
                }
              />
              <MasterValue
                label={t("masterRecord.values.personalContact")}
                value={
                  snapshot.contactProfile?.personalEmail ||
                  snapshot.contactProfile?.personalPhone
                    ? t("masterRecord.values.recorded")
                    : "—"
                }
              />
            </MasterSection>
            <MasterSection title={t("masterRecord.sections.identityDocuments")}>
              {snapshot.identityDocuments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("masterRecord.empty.identityDocuments")}
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {snapshot.identityDocuments.map((doc) => (
                    <li key={doc.id} className="rounded-md border p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{doc.documentType}</span>
                        {doc.isPrimary ? (
                          <Badge variant="outline">
                            {t("masterRecord.badges.primary")}
                          </Badge>
                        ) : null}
                        <span className="text-muted-foreground">
                          {doc.issuingCountry} ·{" "}
                          {maskIdentifier(doc.documentNumber)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </MasterSection>
            <MasterSection title={t("masterRecord.sections.workAuthorization")}>
              {snapshot.workAuthorizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("masterRecord.empty.workAuthorization")}
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {snapshot.workAuthorizations.map((auth) => (
                    <li key={auth.id} className="rounded-md border p-2">
                      <span className="font-medium">
                        {auth.countryCode} · {auth.authorizationType}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {authorizationStatusLabel(auth.status)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </MasterSection>
          </div>
        </CardContent>
      </Card>

      {!employee.archivedAt ? (
        <Card id="employment" size="sm">
          <CardHeader>
            <CardTitle className="text-base">
              {t("masterRecord.updatesTitle")}
            </CardTitle>
            <CardDescription>
              {t("masterRecord.updatesDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmployeeMasterForms orgSlug={orgSlug} snapshot={snapshot} />
          </CardContent>
        </Card>
      ) : null}

      <EmployeePortalAccessCard
        orgSlug={orgSlug}
        employeeId={employee.id}
        linkedUserId={employee.linkedUserId}
        archived={Boolean(employee.archivedAt)}
        access={portalAccess}
      />

      <EmployeeDetailPayrollContract
        orgSlug={orgSlug}
        organizationId={organizationId}
        employeeId={employee.id}
        archivedAt={employee.archivedAt}
      />

      <EmployeeDetailBoardingSection
        orgSlug={orgSlug}
        organizationId={organizationId}
        employeeId={employee.id}
      />

      <EmployeeDetailTrainingSection
        organizationId={organizationId}
        employeeId={employee.id}
      />

      <Card id="dependents" size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("dependentsSectionTitle")}
          </CardTitle>
          <CardDescription>{t("dependentsSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {dependents.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("dependentsEmpty")}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-md border border-border text-sm">
              {dependents.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{d.legalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        DEPENDENT_RELATIONSHIP_MESSAGE_KEY[
                          relationshipKey(d.relationship)
                        ]
                      )}{" "}
                      ·{" "}
                      {d.dateOfBirth
                        ? format.dateTime(d.dateOfBirth, {
                            dateStyle: "medium",
                          })
                        : "—"}{" "}
                      ·{" "}
                      {d.taxDependent
                        ? t("dependentTaxYes")
                        : t("dependentTaxNo")}
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
              <p className="mb-3 text-sm font-medium">
                {t("dependentAddTitle")}
              </p>
              <form
                action={submitCreateDependent}
                className="grid max-w-xl gap-3 sm:grid-cols-2"
              >
                <input type="hidden" name="orgSlug" value={orgSlug} />
                <input type="hidden" name="employeeId" value={employee.id} />
                <div className="sm:col-span-2">
                  <label
                    className="text-sm text-muted-foreground"
                    htmlFor="dep-name"
                  >
                    {t("dependentLegalNameLabel")}
                  </label>
                  <Input
                    id="dep-name"
                    name="legalName"
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <label
                    className="text-sm text-muted-foreground"
                    htmlFor="dep-rel"
                  >
                    {t("dependentRelationshipLabel")}
                  </label>
                  <select
                    id="dep-rel"
                    name="relationship"
                    required
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {HRM_DEPENDENT_RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel}>
                        {t(DEPENDENT_RELATIONSHIP_MESSAGE_KEY[rel])}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="text-sm text-muted-foreground"
                    htmlFor="dep-dob"
                  >
                    {t("dependentDobLabel")}
                  </label>
                  <input
                    id="dep-dob"
                    name="dateOfBirth"
                    type="date"
                    className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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

      <Card id="history" size="sm">
        <CardHeader>
          <CardTitle className="text-base">{t("changeHistoryTitle")}</CardTitle>
          <CardDescription>{t("changeHistoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {changeHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("changeHistoryEmpty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="py-2 pr-3 font-medium">
                      {t("changeHistoryColField")}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {t("changeHistoryColOld")}
                    </th>
                    <th className="py-2 pr-3 font-medium">
                      {t("changeHistoryColNew")}
                    </th>
                    <th className="py-2 font-medium">
                      {t("changeHistoryColWhen")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {changeHistory.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-2 pr-3 font-mono text-xs">
                        {row.fieldName}
                      </td>
                      <td className="max-w-[10rem] truncate py-2 pr-3 font-mono text-xs">
                        {serializeChangeValue(row.oldValue)}
                      </td>
                      <td className="max-w-[10rem] truncate py-2 pr-3 font-mono text-xs">
                        {serializeChangeValue(row.newValue)}
                      </td>
                      <td className="py-2 text-xs whitespace-nowrap text-muted-foreground">
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

function MasterSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-md border border-border p-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  )
}

function MasterValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function placementLabel(
  option: {
    code: string
    label: string
    secondaryLabel: string | null
  } | null
): string {
  if (!option) return "—"
  return `${option.code} · ${option.label}${
    option.secondaryLabel ? ` (${option.secondaryLabel})` : ""
  }`
}

function maskIdentifier(value: string): string {
  if (value.length <= 4) return "••••"
  return `•••• ${value.slice(-4)}`
}

function relationshipKey(
  value: string
): keyof typeof DEPENDENT_RELATIONSHIP_MESSAGE_KEY {
  if (
    value === "spouse" ||
    value === "child" ||
    value === "parent" ||
    value === "other"
  ) {
    return value
  }
  return "other"
}
