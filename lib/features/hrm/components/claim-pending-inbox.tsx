import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import {
  type ClaimRow,
  listPendingClaimApprovalsForOrg,
} from "../data/claim.queries.server"

import { ClaimDecisionForms } from "./claim-decision-form"

/**
 * Admin inbox — pending claims awaiting approval. Async Server Component
 * streamed behind a Suspense boundary so a slow query does not block the
 * page header. Failures degrade locally to a calm inline notice.
 */
export async function ClaimPendingInbox({ isAdmin }: { isAdmin: boolean }) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.claims")

  let rows: ReadonlyArray<ClaimRow>
  try {
    rows = await listPendingClaimApprovalsForOrg(orgSession.organizationId)
  } catch (err) {
    logUnexpectedServerError("claim-pending-inbox: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("inboxLoadFailed")}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("inboxEmpty")}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colEmployee")}</TableHead>
          <TableHead>{t("colClaimType")}</TableHead>
          <TableHead>{t("colClaimDate")}</TableHead>
          <TableHead>{t("colAmount")}</TableHead>
          <TableHead>{t("colEvidence")}</TableHead>
          <TableHead>{t("colSubmitted")}</TableHead>
          {isAdmin ? <TableHead>{t("colActions")}</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const label = `${row.employeeFullName ?? row.employeeId} · ${row.claimTypeCode} · ${row.amount} ${row.currency}`
          return (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {row.employeeFullName ?? row.employeeId}
                  </span>
                  {row.employeeNumber ? (
                    <span className="text-xs text-muted-foreground">
                      {row.employeeNumber}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{row.claimTypeCode}</Badge>
              </TableCell>
              <TableCell>{row.claimDate}</TableCell>
              <TableCell>
                {row.amount} {row.currency}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {t("evidenceCount", { count: row.evidenceCount })}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {row.submittedAt
                  ? row.submittedAt.toLocaleString()
                  : row.createdAt.toLocaleString()}
              </TableCell>
              {isAdmin ? (
                <TableCell>
                  <ClaimDecisionForms claimId={row.id} label={label} />
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
