import { getTranslations } from "next-intl/server"

import { GovernedKanbanFooterSection } from "#features/governed-surface"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"

import type { ClaimSurfaceAccess } from "../data/claim-access.server"
import { canDecideClaimKanbanMove } from "../data/claim-kanban-access.server"
import {
  buildClaimKanbanConfiguration,
  buildClaimKanbanDragConfiguration,
} from "../data/claim-kanban-surface.server"
import {
  CLAIM_KANBAN_COLUMN_IDS,
  type ClaimKanbanColumnId,
} from "../data/claim-kanban-workflow.shared"
import {
  type ClaimRow,
  listClaimsForOrg,
} from "../data/claim.queries.server"

import {
  CLAIMS_KANBAN_SURFACE_KEY,
  ClaimKanbanBoard,
} from "./claim-kanban-board.client"
import { ClaimKanbanDragBoard } from "./claim-kanban-drag-board.client"
import type { ClaimKanbanCardContext } from "./claim-kanban-card-footer.client"

type ClaimKanbanSectionProps = {
  orgSlug: string
  access: ClaimSurfaceAccess
}

export async function ClaimKanbanSection({
  orgSlug,
  access,
}: ClaimKanbanSectionProps) {
  if (!access.canReadOrgClaims) {
    return null
  }

  const orgSession = await requireOrgSession()

  const [t, rowsResult] = await Promise.all([
    getTranslations("Dashboard.Hrm.claims"),
    (async (): Promise<
      | { ok: true; rows: ReadonlyArray<ClaimRow> }
      | { ok: false; error: unknown }
    > => {
      try {
        const rows = await listClaimsForOrg(orgSession.organizationId, {
          states: [...CLAIM_KANBAN_COLUMN_IDS],
          limit: 100,
        })
        return { ok: true, rows }
      } catch (error) {
        return { ok: false, error }
      }
    })(),
  ])

  const columnLabels = Object.fromEntries(
    CLAIM_KANBAN_COLUMN_IDS.map((id) => [
      id,
      resolveClaimKanbanColumnLabel(t, id),
    ])
  ) as Record<ClaimKanbanColumnId, string>

  const copy = {
    boardAriaLabel: t("kanban.title"),
    emptyColumn: t("kanban.empty"),
    columnLabels,
    evidenceCount: (count: number) => t("evidenceCount", { count }),
    underReview: t("state.under_review"),
  }

  let loadError:
    | {
        variant: "error"
        title: string
      }
    | undefined

  if (!rowsResult.ok) {
    logUnexpectedServerError("claim-kanban-section: query failed", rowsResult.error, {
      organizationId: orgSession.organizationId,
    })
    loadError = {
      variant: "error",
      title: t("kanban.loadFailed"),
    }
  }

  const rows = rowsResult.ok ? rowsResult.rows : []

  const useDragBoard = access.canManage

  const dragCopy = {
    ...copy,
    dragHandleAriaLabel: t("kanban.dragHandleAriaLabel"),
    cancelTransitionLabel: t("kanban.cancelledColumn"),
    dragDisabledUseInbox: t("kanban.dragDisabledUseInbox"),
    dragDisabledNotCancellable: t("kanban.dragDisabledNotCancellable"),
  }

  if (useDragBoard) {
    const dragConfiguration = buildClaimKanbanDragConfiguration(rows, dragCopy)

    return (
      <GovernedKanbanFooterSection
        surfaceKey={CLAIMS_KANBAN_SURFACE_KEY}
        sectionTestId="governed-list-section:hrm:claims:kanban"
        title={t("kanban.title")}
        description={t("kanban.dragDescription")}
        loadError={loadError}
      >
        <ClaimKanbanDragBoard configuration={dragConfiguration} />
      </GovernedKanbanFooterSection>
    )
  }

  const configuration = buildClaimKanbanConfiguration(rows, copy)

  const submittedRows = rows.filter((row) => row.state === "submitted")

  const decideResults =
    rowsResult.ok && submittedRows.length > 0
      ? await Promise.all(
          submittedRows.map(async (row) => [
            row.id,
            await canDecideClaimKanbanMove({
              organizationId: orgSession.organizationId,
              userId: orgSession.userId,
              claim: row,
            }),
          ] as const)
        )
      : []

  const canDecideByClaimId = new Map(decideResults)

  const cardContexts = Object.fromEntries(
    rows.map((row) => {
      const label = `${row.employeeFullName ?? row.employeeId} · ${row.claimTypeCode} · ${row.amount} ${row.currency}`
      const context: ClaimKanbanCardContext = {
        claimId: row.id,
        state: row.state,
        label,
        requestedAmount: row.amount,
        currency: row.currency,
        canDecide: canDecideByClaimId.get(row.id) ?? false,
      }
      return [row.id, context]
    })
  )

  return (
    <GovernedKanbanFooterSection
      surfaceKey={CLAIMS_KANBAN_SURFACE_KEY}
      sectionTestId="governed-list-section:hrm:claims:kanban"
      title={t("kanban.title")}
      description={t("kanban.description")}
      loadError={loadError}
    >
      <ClaimKanbanBoard
        configuration={configuration}
        cardContexts={cardContexts}
        orgSlug={orgSlug}
      />
    </GovernedKanbanFooterSection>
  )
}

function resolveClaimKanbanColumnLabel(
  t: Awaited<ReturnType<typeof getTranslations<"Dashboard.Hrm.claims">>>,
  columnId: ClaimKanbanColumnId
): string {
  switch (columnId) {
    case "submitted":
      return t("kanban.submittedColumn")
    case "returned":
      return t("kanban.returnedColumn")
    case "approved":
      return t("kanban.approvedColumn")
    case "rejected":
      return t("kanban.rejectedColumn")
    case "paid":
      return t("kanban.paidColumn")
    case "cancelled":
      return t("kanban.cancelledColumn")
    default:
      return columnId
  }
}
