import { getTranslations } from "next-intl/server"
import { and, desc, eq } from "drizzle-orm"

import { requireOrgSession } from "#lib/auth"
import { db } from "#lib/db"
import { hrmApproval } from "#lib/db/schema"

import { AttendanceCorrectionApproveButton } from "./attendance-correction-approve-button.client"

export async function AttendanceCorrectionPending() {
  const [session, t] = await Promise.all([
    requireOrgSession(),
    getTranslations("Dashboard.Hrm.attendance"),
  ])

  const rows = await db.query.hrmApproval.findMany({
    where: and(
      eq(hrmApproval.organizationId, session.organizationId),
      eq(hrmApproval.subjectKind, "attendance_correction"),
      eq(hrmApproval.state, "pending")
    ),
    columns: {
      id: true,
      subjectId: true,
      requestedAt: true,
      snapshot: true,
    },
    orderBy: [desc(hrmApproval.requestedAt)],
    limit: 50,
  })

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("correctionPendingEmpty")}
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">{t("correctionPendingColEvent")}</th>
            <th className="pb-2 pr-4 font-medium">{t("correctionPendingColRequested")}</th>
            <th className="pb-2 font-medium">{t("colActions")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60">
              <td className="py-2 pr-4 font-mono text-xs">{row.subjectId}</td>
              <td className="py-2 pr-4 tabular-nums">
                {row.requestedAt.toISOString().slice(0, 10)}
              </td>
              <td className="py-2">
                <AttendanceCorrectionApproveButton approvalId={row.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
