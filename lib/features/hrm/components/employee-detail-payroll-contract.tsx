import { getFormatter, getTranslations } from "next-intl/server"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Separator } from "#components/ui/separator"
import { Badge } from "#components/ui/badge"

import { listEmploymentContractsForEmployee } from "../data/employment-contract.queries.server"
import { listHrmDocumentsForEmployee } from "../data/hrm-document.queries.server"
import { getCurrentPayrollProfileForEmployee } from "../data/payroll-profile.queries.server"

import {
  isHrmContractType,
  isHrmPayFrequency,
} from "../schemas/employment-contract.schema"
import { isHrmDocumentType } from "../schemas/hrm-document.schema"

import { EmploymentContractDraftForm } from "./employment-contract-draft-form"
import { EmploymentContractLifecycleForms } from "./employment-contract-lifecycle-forms"
import { EmploymentContractSalaryRevisionForm } from "./employment-contract-salary-revision-form"
import { HrmDocumentAttachForm } from "./hrm-document-attach-form"
import { PayrollProfileForm } from "./payroll-profile-form"

type EmployeeDetailPayrollContractProps = {
  orgSlug: string
  organizationId: string
  employeeId: string
  archivedAt: Date | null
}

export async function EmployeeDetailPayrollContract({
  orgSlug,
  organizationId,
  employeeId,
  archivedAt,
}: EmployeeDetailPayrollContractProps) {
  if (archivedAt) {
    return null
  }

  const [
    t,
    tContractTypes,
    tPayFrequencies,
    tDocumentTypes,
    format,
    contracts,
    payrollProfile,
    documents,
  ] = await Promise.all([
    getTranslations("Dashboard.Hrm.workforce"),
    getTranslations("Dashboard.Hrm.workforce.contractTypes"),
    getTranslations("Dashboard.Hrm.workforce.payFrequencies"),
    getTranslations("Dashboard.Hrm.workforce.documentTypes"),
    getFormatter(),
    listEmploymentContractsForEmployee(organizationId, employeeId),
    getCurrentPayrollProfileForEmployee(organizationId, employeeId),
    listHrmDocumentsForEmployee(organizationId, employeeId),
  ])

  const draftContracts = contracts
    .filter((c) => c.state === "draft")
    .map((c) => ({ id: c.id, versionNumber: c.versionNumber }))

  const hasActiveContract = contracts.some((c) => c.state === "active")

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("contractSectionTitle")}
          </CardTitle>
          <CardDescription>{t("contractSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <EmploymentContractDraftForm
            orgSlug={orgSlug}
            employeeId={employeeId}
          />
          <EmploymentContractSalaryRevisionForm
            orgSlug={orgSlug}
            employeeId={employeeId}
            hasActiveContract={hasActiveContract}
          />
          <div className="flex flex-col gap-4">
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("contractEmpty")}
              </p>
            ) : (
              contracts.map((c) => (
                <div key={c.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {t("contractVersionLabel", { version: c.versionNumber })}
                    </span>
                    <Badge variant="outline">{c.state}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {t("contractTypeLabel")}:{" "}
                      {isHrmContractType(c.contractType)
                        ? tContractTypes(c.contractType)
                        : c.contractType}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">
                        {t("contractEffectiveFrom")}
                      </dt>
                      <dd>
                        {format.dateTime(c.effectiveFrom, {
                          dateStyle: "medium",
                        })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t("contractSignedDocLabel")}
                      </dt>
                      <dd>
                        {c.signedDocumentId
                          ? t("contractSignedYes")
                          : t("contractSignedNo")}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t("contractPayFrequency")}
                      </dt>
                      <dd>
                        {isHrmPayFrequency(c.payFrequency)
                          ? tPayFrequencies(c.payFrequency)
                          : c.payFrequency}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">
                        {t("contractBaseSalary")}
                      </dt>
                      <dd>
                        {c.baseSalaryAmount
                          ? `${c.baseSalaryAmount} ${c.baseSalaryCurrency}`
                          : "—"}
                      </dd>
                    </div>
                  </dl>
                  <EmploymentContractLifecycleForms
                    orgSlug={orgSlug}
                    contract={c}
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("payrollSectionTitle")}
          </CardTitle>
          <CardDescription>{t("payrollSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PayrollProfileForm
            orgSlug={orgSlug}
            employeeId={employeeId}
            current={payrollProfile}
            currentEffectiveLabel={
              payrollProfile
                ? format.dateTime(payrollProfile.effectiveFrom, {
                    dateStyle: "medium",
                  })
                : null
            }
          />
        </CardContent>
      </Card>

      <Separator />

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-base">
            {t("documentSectionTitle")}
          </CardTitle>
          <CardDescription>{t("documentSectionDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <HrmDocumentAttachForm
            orgSlug={orgSlug}
            organizationId={organizationId}
            employeeId={employeeId}
            draftContracts={draftContracts}
          />
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t("documentVaultTitle")}
            </p>
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("documentVaultEmpty")}
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {doc.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isHrmDocumentType(doc.documentType)
                          ? tDocumentTypes(doc.documentType)
                          : doc.documentType}{" "}
                        ·{" "}
                        {format.dateTime(doc.uploadedAt, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <a
                      href={doc.blobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      {t("documentOpen")}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
