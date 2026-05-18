import { getTranslations } from "next-intl/server"

import { GovernedPatternCListSection } from "#features/governed-surface"
import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import { buildLeaveTypesPolicyListSurfaceConfiguration } from "../data/leave-policy-list-surface.server"
import { isHrmLeaveAccrualMethod } from "../data/leave-policy-display.shared"
import {
  type LeaveTypeAdminRow,
  listAllLeaveTypesForOrg,
} from "../data/leave-policy.queries.server"

import { LeaveTypeEditDialog } from "./policies-leave-type-edit-dialog"

type PoliciesLeaveTypesSectionProps = {
  isAdmin: boolean
  includeArchived: boolean
  orgSlug: string
}

export async function PoliciesLeaveTypesSection({
  isAdmin,
  includeArchived,
  orgSlug,
}: PoliciesLeaveTypesSectionProps) {
  const orgSession = await requireOrgSession()
  const t = await getTranslations("Dashboard.Hrm.policies")

  let rows: LeaveTypeAdminRow[]
  try {
    rows = await listAllLeaveTypesForOrg(orgSession.organizationId)
  } catch (err) {
    logUnexpectedServerError("policies-leave-types-section: query failed", err, {
      organizationId: orgSession.organizationId,
    })
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={{
          dataNature: "table",
          surface: {
            header: { title: "hrm-leave-types-policy" },
            columnsId: "hrm-leave-types-policy",
            rowKey: "id",
            empty: { variant: "muted", title: t("leaveTypes.noTypesTitle") },
          },
          columns: [{ id: "code", header: t("leaveTypes.colCode") }],
          rows: [],
        }}
        surfaceKey="hrm:leave-types:policy:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("leaveTypes.noTypesTitle"),
          description: t("leaveTypes.noTypesBody"),
        }}
      />
    )
  }

  const visibleRows = includeArchived
    ? rows
    : rows.filter((row) => row.archivedAt === null)

  const listConfiguration = buildLeaveTypesPolicyListSurfaceConfiguration(
    visibleRows,
    {
      empty: t("leaveTypes.noTypesBody"),
      colCode: t("leaveTypes.colCode"),
      colAccrual: t("leaveTypes.colAccrual"),
      colPaid: t("leaveTypes.colPaid"),
      colTiers: t("leaveTypes.colTiers"),
      colCarryForward: t("leaveTypes.colCarryForward"),
      colStatus: t("leaveTypes.colStatus"),
      ea2023Hint: t("leaveTypes.ea2023Hint"),
      accrualLabel: (method) =>
        isHrmLeaveAccrualMethod(method)
          ? t(`leaveType.accrualMethod.${method}`)
          : method,
      paidYes: t("leaveType.paidYes"),
      paidNo: t("leaveType.paidNo"),
      statusActive: t("leaveType.statusActive"),
      statusArchived: t("leaveType.statusArchived"),
      tierLabel: (years, days) => t("leaveTypes.tierLabel", { years, days }),
      fixedDaysLabel: (days) => t("leaveTypes.fixedDaysLabel", { days }),
      carryForwardDays: (days) => t("leaveTypes.carryForwardDays", { days }),
      carryForwardExpiry: (months) =>
        t("leaveTypes.carryForwardExpiry", { months }),
      carryForwardNone: t("leaveTypes.carryForwardNone"),
    }
  )

  const rowById = new Map(visibleRows.map((row) => [row.id, row]))
  const archiveToggle = (
    <ArchiveToggleLink
      orgSlug={orgSlug}
      includeArchived={includeArchived}
      showArchivedLabel={t("leaveTypes.showArchived")}
      hideArchivedLabel={t("leaveTypes.hideArchived")}
      alignment={visibleRows.length === 0 ? "center" : "end"}
    />
  )

  return (
    <GovernedPatternCListSection
      title={t("leaveTypes.title")}
      description={t("leaveTypes.description")}
      listConfiguration={listConfiguration}
      surfaceKey="hrm:leave-types:policy"
      cardClassName="mt-0 border-solid border-border"
      contentBeforeList={
        visibleRows.length > 0 ? (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {t("leaveTypes.totalCount", { count: visibleRows.length })}
            </p>
            {archiveToggle}
          </div>
        ) : undefined
      }
      contentAfterList={
        visibleRows.length === 0 ? (
          <div className="pt-2">{archiveToggle}</div>
        ) : undefined
      }
      trailingColumn={
        isAdmin
          ? {
              header: t("leaveTypes.colActions"),
              render: (surfaceRow) => {
                const row = rowById.get(surfaceRow.id)
                if (!row) return null
                return <LeaveTypeEditDialog row={row} />
              },
            }
          : undefined
      }
    />
  )
}

type ArchiveToggleLinkProps = {
  orgSlug: string
  includeArchived: boolean
  showArchivedLabel: string
  hideArchivedLabel: string
  alignment: "center" | "end"
}

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
