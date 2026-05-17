import { getTranslations } from "next-intl/server"

import { Badge } from "#components2/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components2/ui/table"

import { isBenefitClaimStatus } from "../data/benefit-helpers.shared"
import type { BenefitClaimReferenceRow } from "../data/benefit-claim-reference.queries.server"

import { BenefitClaimReferenceCreateDialog } from "./benefit-claim-reference-create-dialog"
import type {
  BenefitEnrollmentChoice,
  BenefitProviderChoice,
} from "./benefit-claim-reference-form"
import { BenefitClaimReferenceUpdateForm } from "./benefit-claim-reference-update-form"

type BenefitClaimReferencesTableProps = {
  isAdmin: boolean
  rows: readonly BenefitClaimReferenceRow[]
  enrollments: readonly BenefitEnrollmentChoice[]
  providers: readonly BenefitProviderChoice[]
  enrollmentLabels: ReadonlyMap<string, string>
}

function claimStatusVariant(
  status: string
): "success" | "warning" | "destructive" | "secondary" {
  if (status === "paid" || status === "approved") return "success"
  if (status === "submitted") return "warning"
  if (status === "rejected") return "destructive"
  return "secondary"
}

export async function BenefitClaimReferencesTable({
  isAdmin,
  rows,
  enrollments,
  providers,
  enrollmentLabels,
}: BenefitClaimReferencesTableProps) {
  const t = await getTranslations("Dashboard.Hrm.benefits.claimReferencesTable")

  if (rows.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {isAdmin ? (
          <div className="flex justify-end">
            <BenefitClaimReferenceCreateDialog
              enrollments={enrollments}
              providers={providers}
            />
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {isAdmin ? t("emptyAdmin") : t("emptyMember")}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {isAdmin ? (
        <div className="flex justify-end">
          <BenefitClaimReferenceCreateDialog
            enrollments={enrollments}
            providers={providers}
          />
        </div>
      ) : null}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colExternalId")}</TableHead>
            <TableHead>{t("colEnrollment")}</TableHead>
            <TableHead>{t("colStatus")}</TableHead>
            <TableHead>{t("colAmount")}</TableHead>
            <TableHead>{t("colPaymentRef")}</TableHead>
            {isAdmin ? (
              <TableHead className="text-end">{t("colActions")}</TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-sm">
                {row.externalClaimId}
              </TableCell>
              <TableCell className="max-w-xs truncate text-sm">
                {enrollmentLabels.get(row.enrollmentId) ?? row.enrollmentId}
              </TableCell>
              <TableCell>
                <Badge variant={claimStatusVariant(row.claimStatus)}>
                  {isBenefitClaimStatus(row.claimStatus)
                    ? t(`claimStatuses.${row.claimStatus}`)
                    : row.claimStatus}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.claimedAmount
                  ? `${row.currency} ${row.claimedAmount}`
                  : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.paymentReference ?? "—"}
              </TableCell>
              {isAdmin ? (
                <TableCell className="text-end">
                  <BenefitClaimReferenceUpdateForm
                    claimReferenceId={row.id}
                    claimStatus={row.claimStatus}
                    claimedAmount={row.claimedAmount}
                    paymentReference={row.paymentReference}
                  />
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
