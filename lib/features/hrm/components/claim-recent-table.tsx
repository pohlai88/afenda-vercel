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

import { type ClaimRow, listClaimsForOrg } from "../data/claim.queries.server"
import type { ClaimStateValue } from "../data/claim-helpers.shared"

const STATE_TONE: Record<
  ClaimStateValue,
  "default" | "outline" | "destructive" | "secondary"
> = {
  draft: "outline",
  submitted: "outline",
  approved: "default",
  paid: "secondary",
  rejected: "destructive",
  cancelled: "outline",
}

/**
 * Recent claims across the organization. Read-only audit trail surfaced
 * on the claims page so admins and members can audit decisions without
 * a separate route.
 */
export async function ClaimRecentTable() {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.claims")

  let rows: ReadonlyArray<ClaimRow>
  try {
    rows = await listClaimsForOrg(orgSession.organizationId)
  } catch (err) {
    logUnexpectedServerError("claim-recent-table: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("recentLoadFailed")}
      </p>
    )
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("recentEmpty")}</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("colEmployee")}</TableHead>
          <TableHead>{t("colClaimType")}</TableHead>
          <TableHead>{t("colClaimDate")}</TableHead>
          <TableHead>{t("colAmount")}</TableHead>
          <TableHead>{t("colState")}</TableHead>
          <TableHead>{t("colSubmitted")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.slice(0, 50).map((row) => (
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
            <TableCell>
              <Badge variant={STATE_TONE[row.state]}>
                {t(`state.${row.state}`)}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {row.submittedAt
                ? row.submittedAt.toLocaleString()
                : row.createdAt.toLocaleString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
