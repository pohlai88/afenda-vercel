import { getTranslations } from "next-intl/server"
import { and, desc, eq } from "drizzle-orm"

import {
  GovernedPatternCListSection,
  isListSurfaceTrailingActionRenderable,
} from "#features/governed-surface"
import { GovernedTrailingActionSlot } from "#features/governed-surface/client"
import { logUnexpectedServerError } from "#lib/logger.server"
import { requireOrgSession } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval } from "#lib/db/schema"

import {
  buildAttendanceCorrectionPendingListSurfaceConfiguration,
  type AttendanceCorrectionPendingRow,
} from "../data/attendance-list-surface.server"
import { ATTENDANCE_LIST_SURFACE_IDS } from "../data/attendance-surface-metadata.shared"
import { buildEmbeddedListSurfaceErrorConfiguration } from "../data/lam-embedded-list-surface-error.server"

import { AttendanceCorrectionApproveButton } from "./attendance-correction-approve-button.client"

export async function AttendanceCorrectionPending() {
  const [session, t] = await Promise.all([
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.attendance"),
  ])

  let rows: AttendanceCorrectionPendingRow[]
  try {
    const pending = await db.query.hrmApproval.findMany({
      where: and(
        eq(hrmApproval.organizationId, session.organizationId),
        eq(hrmApproval.subjectKind, "attendance_correction"),
        eq(hrmApproval.state, "pending")
      ),
      columns: {
        id: true,
        subjectId: true,
        requestedAt: true,
      },
      orderBy: [desc(hrmApproval.requestedAt)],
      limit: 50,
    })
    rows = pending.map((row) => ({
      id: row.id,
      subjectId: row.subjectId,
      requestedAt: row.requestedAt.toISOString().slice(0, 10),
    }))
  } catch (err) {
    logUnexpectedServerError(
      "attendance-correction-pending: query failed",
      err,
      { organizationId: session.organizationId }
    )
    return (
      <GovernedPatternCListSection
        layout="embedded"
        title=""
        listConfiguration={buildEmbeddedListSurfaceErrorConfiguration({
          columnsId: ATTENDANCE_LIST_SURFACE_IDS.correctionPending,
          emptyTitle: t("correctionPendingEmpty"),
          firstColumn: { id: "event", header: t("correctionPendingColEvent") },
        })}
        surfaceKey="hrm:attendance:correction-pending:error"
        resolveConfiguredPermission={false}
        loadError={{
          variant: "error",
          title: t("correctionPendingLoadFailed"),
        }}
      />
    )
  }

  const listConfiguration = buildAttendanceCorrectionPendingListSurfaceConfiguration(
    rows,
    {
      empty: t("correctionPendingEmpty"),
      colEvent: t("correctionPendingColEvent"),
      colRequested: t("correctionPendingColRequested"),
      approveLabel: t("correctionPendingApprove"),
    }
  )

  const rowById = new Map(rows.map((row) => [row.id, row]))

  return (
    <GovernedPatternCListSection
      layout="embedded"
      title=""
      listConfiguration={listConfiguration}
      surfaceKey="hrm:attendance:correction-pending"
      parentAccessAllowed
      trailingColumn={{
        header: t("colActions"),
        render: (surfaceRow) => {
          const row = rowById.get(surfaceRow.id)
          if (
            !row ||
            !isListSurfaceTrailingActionRenderable(surfaceRow.trailingAction)
          ) {
            return null
          }
          return (
            <GovernedTrailingActionSlot
              trailingAction={surfaceRow.trailingAction}
            >
              <AttendanceCorrectionApproveButton approvalId={row.id} />
            </GovernedTrailingActionSlot>
          )
        },
      }}
    />
  )
}
