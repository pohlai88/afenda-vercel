import { notFound } from "next/navigation"
import { getFormatter, getTranslations } from "next-intl/server"
import { z } from "zod"

import type { ReactNode } from "react"
import type { Route } from "next"

import { Link } from "#i18n/navigation"
import { ModulePageHeader } from "#components/module-page-header"
import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { requireOrgSession } from "#lib/tenant"

import {
  organizationHrmClaimsPath,
  organizationHrmEmployeePath,
} from "../../../constants"
import type { ClaimSurfaceAccess } from "../data/claim-access.server"
import {
  getClaimDetail,
  isClaimAssignedApprover,
} from "../data/claim.queries.server"
import type { ClaimStateValue } from "../data/claim-helpers.shared"

import { ClaimDecisionForms } from "./claim-decision-form"

type ClaimDetailPageProps = {
  orgSlug: string
  claimId: string
  access: ClaimSurfaceAccess
}

const STATE_TONE: Record<
  ClaimStateValue,
  "default" | "outline" | "destructive" | "secondary"
> = {
  draft: "outline",
  submitted: "outline",
  returned: "outline",
  approved: "default",
  paid: "secondary",
  rejected: "destructive",
  cancelled: "outline",
}

export async function ClaimDetailPage({
  orgSlug,
  claimId,
  access,
}: ClaimDetailPageProps) {
  const idParsed = z.string().uuid().safeParse(claimId)
  if (!idParsed.success) notFound()

  const orgSession = await requireOrgSession()
  const detail = await getClaimDetail(orgSession.organizationId, idParsed.data)
  if (!detail) notFound()
  const canDecideAsAssignedApprover = await isClaimAssignedApprover({
    organizationId: orgSession.organizationId,
    userId: orgSession.userId,
    currentApprovalId: detail.claim.currentApprovalId,
  })
  if (
    !access.canReadOrgClaims &&
    access.selfServiceEmployeeId !== detail.claim.employeeId &&
    !canDecideAsAssignedApprover
  ) {
    notFound()
  }

  const [t, format] = await Promise.all([
    getTranslations("Dashboard.Hrm.claims"),
    getFormatter(),
  ])
  const { claim, evidence } = detail
  const submittedLabel = claim.submittedAt
    ? format.dateTime(claim.submittedAt, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null
  const decidedLabel = claim.decidedAt
    ? format.dateTime(claim.decidedAt, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null
  const employeeHref = organizationHrmEmployeePath(orgSlug, claim.employeeId)
  const decisionLabel = `${claim.employeeFullName ?? claim.employeeId} · ${claim.claimTypeCode} · ${claim.amount} ${claim.currency}`

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <Link
          href={organizationHrmClaimsPath(orgSlug) as Route}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t("detailBack")}
        </Link>
        <ModulePageHeader
          eyebrow={t("eyebrow")}
          title={claim.claimNumber ?? claim.id}
          description={t("detailDescription")}
        />
      </div>

      <Card size="sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">{claim.claimTypeName}</CardTitle>
            <Badge variant={STATE_TONE[claim.state]}>
              {t(`state.${claim.state}`)}
            </Badge>
            <Badge variant="outline">{claim.payoutMethod}</Badge>
          </div>
          <CardDescription>
            {claim.description ?? t("detailNoDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm md:grid-cols-3">
            <DetailItem label={t("fieldEmployee")}>
              <Link
                href={employeeHref as Route}
                className="font-medium hover:underline"
              >
                {claim.employeeFullName ?? claim.employeeId}
              </Link>
            </DetailItem>
            <DetailItem label={t("fieldClaimDate")}>
              {claim.claimDate}
            </DetailItem>
            <DetailItem label={t("fieldAmount")}>
              {claim.amount} {claim.currency}
            </DetailItem>
            <DetailItem label={t("detailSubmittedAt")}>
              {submittedLabel ?? "-"}
            </DetailItem>
            <DetailItem label={t("detailDecidedAt")}>
              {decidedLabel ?? "-"}
            </DetailItem>
            <DetailItem label={t("colEvidence")}>
              {t("evidenceCount", { count: claim.evidenceCount })}
            </DetailItem>
            <DetailItem label={t("detailFinanceAccount")}>
              {claim.financeAccountCode ?? "-"}
            </DetailItem>
            <DetailItem label={t("detailCostCenter")}>
              {claim.costCenterCode ?? "-"}
            </DetailItem>
            <DetailItem label={t("detailTaxTreatment")}>
              {claim.taxTreatment}
            </DetailItem>
          </dl>

          {(access.canManage || canDecideAsAssignedApprover) &&
          claim.state === "submitted" ? (
            <div className="border-t border-border pt-4">
              <ClaimDecisionForms
                claimId={claim.id}
                label={decisionLabel}
                requestedAmount={claim.amount}
                currency={claim.currency}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>{t("detailEvidenceTitle")}</CardTitle>
          <CardDescription>{t("detailEvidenceDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {(claim.policyEvidenceRequired ?? claim.requiresEvidence)
                ? t("detailEvidenceRequiredEmpty")
                : t("detailEvidenceEmpty")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("detailEvidenceDocument")}</TableHead>
                  <TableHead>{t("detailEvidenceType")}</TableHead>
                  <TableHead>{t("detailEvidenceUploaded")}</TableHead>
                  <TableHead>{t("detailEvidenceSize")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evidence.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Button asChild variant="link" className="h-auto p-0">
                        <a href={row.documentBlobUrl}>{row.documentTitle}</a>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{row.evidenceType}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format.dateTime(row.uploadedAt, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format.number(row.documentSizeBytes)}
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

function DetailItem({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}
