import { getTranslations } from "next-intl/server"

import { Badge } from "#components/ui/badge"
import { Button } from "#components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#components/ui/table"
import { Link } from "#i18n/navigation"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/tenant"

import {
  hrmLeaveAccrualMethodTone,
  hrmLeaveTypeStatusTone,
  isHrmLeaveAccrualMethod,
  isMyEa2023LeaveTypeCode,
} from "../data/leave-policy-display.shared"
import {
  type LeaveTypeAdminRow,
  listAllLeaveTypesForOrg,
} from "../data/leave-policy.queries.server"

import { LeaveTypeEditDialog } from "./policies-leave-type-edit-dialog"

const ACCRUAL_TONE_BADGE: Record<
  string,
  "default" | "outline" | "secondary" | "destructive" | "success" | "info"
> = {
  positive: "success",
  info: "info",
  muted: "outline",
  neutral: "secondary",
}

const STATUS_TONE_BADGE: Record<
  string,
  "default" | "outline" | "secondary" | "destructive" | "success" | "info"
> = {
  positive: "success",
  muted: "outline",
}

type PoliciesLeaveTypesTableProps = {
  isAdmin: boolean
  includeArchived: boolean
  orgSlug: string
}

/**
 * Server-rendered table of `hrm_leave_type` rows for the active org.
 * Streams behind the page-level Suspense boundary on
 * {@link PoliciesPage} so a slow catalog scan never blocks the header
 * or the seed / create CTAs.
 *
 * Failure mode mirrors the documents library: a thrown query becomes a
 * calm inline notice instead of cascading into the workbench
 * `error.tsx` boundary, so the rest of the policies surface stays
 * usable. Tenant scoping happens at the query layer
 * (`listAllLeaveTypesForOrg` is parametric on `organizationId` resolved
 * via `requireOrgSession` here).
 */
export async function PoliciesLeaveTypesTable({
  isAdmin,
  includeArchived,
  orgSlug,
}: PoliciesLeaveTypesTableProps) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.policies")

  let rows: LeaveTypeAdminRow[]
  try {
    rows = await listAllLeaveTypesForOrg(orgSession.organizationId)
  } catch (err) {
    logUnexpectedServerError("policies-leave-types-table: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <p className="text-sm text-destructive" role="status" aria-live="polite">
        {t("leaveTypes.noTypesTitle")}
      </p>
    )
  }

  const visibleRows = includeArchived
    ? rows
    : rows.filter((row) => row.archivedAt === null)

  if (visibleRows.length === 0) {
    return (
      <div className="flex flex-col gap-3 py-6 text-center">
        <div>
          <p className="text-sm font-medium">{t("leaveTypes.noTypesTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("leaveTypes.noTypesBody")}
          </p>
        </div>
        <ArchiveToggleLink
          orgSlug={orgSlug}
          includeArchived={includeArchived}
          showArchivedLabel={t("leaveTypes.showArchived")}
          hideArchivedLabel={t("leaveTypes.hideArchived")}
          alignment="center"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {t("leaveTypes.totalCount", { count: visibleRows.length })}
        </p>
        <ArchiveToggleLink
          orgSlug={orgSlug}
          includeArchived={includeArchived}
          showArchivedLabel={t("leaveTypes.showArchived")}
          hideArchivedLabel={t("leaveTypes.hideArchived")}
          alignment="end"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("leaveTypes.colCode")}</TableHead>
            <TableHead>{t("leaveTypes.colAccrual")}</TableHead>
            <TableHead>{t("leaveTypes.colPaid")}</TableHead>
            <TableHead>{t("leaveTypes.colTiers")}</TableHead>
            <TableHead>{t("leaveTypes.colCarryForward")}</TableHead>
            <TableHead>{t("leaveTypes.colStatus")}</TableHead>
            {isAdmin ? (
              <TableHead className="text-right">
                {t("leaveTypes.colActions")}
              </TableHead>
            ) : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.map((row) => {
            const accrualTone = hrmLeaveAccrualMethodTone(row.accrualMethod)
            const accrualVariant =
              ACCRUAL_TONE_BADGE[accrualTone] ?? "secondary"
            const accrualLabel = isHrmLeaveAccrualMethod(row.accrualMethod)
              ? t(`leaveType.accrualMethod.${row.accrualMethod}`)
              : row.accrualMethod
            const statusTone = hrmLeaveTypeStatusTone(row.archivedAt)
            const statusVariant = STATUS_TONE_BADGE[statusTone] ?? "outline"
            const statusLabel =
              row.archivedAt === null
                ? t("leaveType.statusActive")
                : t("leaveType.statusArchived")

            return (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">
                      {row.code}
                    </span>
                    {isMyEa2023LeaveTypeCode(row.code) ? (
                      <Badge variant="outline" className="text-xs">
                        {t("leaveTypes.ea2023Hint")}
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={accrualVariant}>{accrualLabel}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {row.paid ? t("leaveType.paidYes") : t("leaveType.paidNo")}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <EntitlementSummary
                    row={row}
                    tierTemplate={(years, days) =>
                      t("leaveTypes.tierLabel", { years, days })
                    }
                    fixedTemplate={(days) =>
                      t("leaveTypes.fixedDaysLabel", { days })
                    }
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  <CarryForwardSummary
                    row={row}
                    daysTemplate={(days) =>
                      t("leaveTypes.carryForwardDays", { days })
                    }
                    expiryTemplate={(months) =>
                      t("leaveTypes.carryForwardExpiry", { months })
                    }
                    noneLabel={t("leaveTypes.carryForwardNone")}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                </TableCell>
                {isAdmin ? (
                  <TableCell className="text-right">
                    <LeaveTypeEditDialog row={row} />
                  </TableCell>
                ) : null}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

type EntitlementSummaryProps = {
  row: LeaveTypeAdminRow
  tierTemplate: (years: number, days: number) => string
  fixedTemplate: (days: number) => string
}

function EntitlementSummary({
  row,
  tierTemplate,
  fixedTemplate,
}: EntitlementSummaryProps) {
  if (row.fixedDaysPerYear !== null) {
    return <span>{fixedTemplate(row.fixedDaysPerYear)}</span>
  }
  const segments: string[] = []
  if (row.tier1Days !== null) {
    segments.push(tierTemplate(0, row.tier1Days))
  }
  if (row.tier2Days !== null && row.tier1MaxYears !== null) {
    segments.push(tierTemplate(row.tier1MaxYears, row.tier2Days))
  }
  if (row.tier3Days !== null && row.tier2MaxYears !== null) {
    segments.push(tierTemplate(row.tier2MaxYears, row.tier3Days))
  }
  if (segments.length === 0) {
    return <span>—</span>
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {segments.map((segment) => (
        <li key={segment}>{segment}</li>
      ))}
    </ul>
  )
}

type CarryForwardSummaryProps = {
  row: LeaveTypeAdminRow
  daysTemplate: (days: number) => string
  expiryTemplate: (months: number) => string
  noneLabel: string
}

function CarryForwardSummary({
  row,
  daysTemplate,
  expiryTemplate,
  noneLabel,
}: CarryForwardSummaryProps) {
  if (row.maxCarryForwardDays === 0) {
    return <span>{noneLabel}</span>
  }
  return (
    <span>
      {daysTemplate(row.maxCarryForwardDays)}
      {row.carryForwardExpiryMonths !== null
        ? ` ${expiryTemplate(row.carryForwardExpiryMonths)}`
        : ""}
    </span>
  )
}

type ArchiveToggleLinkProps = {
  orgSlug: string
  includeArchived: boolean
  showArchivedLabel: string
  hideArchivedLabel: string
  alignment: "center" | "end"
}

/**
 * Sticky URL toggle for the "include archived rows" filter. Implemented
 * as a real anchor instead of a button + router push so the link is
 * crawlable, copyable, and survives Cmd-click. Same idiom as the org
 * admin sidebar tabs.
 */
function ArchiveToggleLink({
  orgSlug,
  includeArchived,
  showArchivedLabel,
  hideArchivedLabel,
  alignment,
}: ArchiveToggleLinkProps) {
  const params = new URLSearchParams()
  params.set("tab", "leave_types")
  if (!includeArchived) {
    params.set("includeArchived", "true")
  }
  const href = `/o/${orgSlug}/dashboard/hrm/policies?${params.toString()}`
  const wrapperClass =
    alignment === "center" ? "flex justify-center" : "flex justify-end"

  return (
    <div className={wrapperClass}>
      <Button asChild size="sm" variant="ghost">
        <Link href={href}>
          {includeArchived ? hideArchivedLabel : showArchivedLabel}
        </Link>
      </Button>
    </div>
  )
}
