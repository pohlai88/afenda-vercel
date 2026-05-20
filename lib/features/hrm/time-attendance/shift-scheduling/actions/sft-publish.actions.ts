"use server"

import { after } from "next/server"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmShiftRosterPublication } from "#lib/db/schema"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { SftPublishRosterFormState } from "../../../types"
import { HRM_SFT_AUDIT } from "../sft.contract"
import { publishRosterSchema } from "../schemas/sft.schema"
import { notifyRosterPublished } from "../data/sft-notification.server"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"

export async function publishShiftRosterAction(
  _prev: SftPublishRosterFormState | undefined,
  formData: FormData
): Promise<SftPublishRosterFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "update",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = publishRosterSchema.safeParse({
    periodStart: formData.get("periodStart"),
    periodEnd: formData.get("periodEnd"),
    note: formData.get("note") || null,
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      periodStart: flat.periodStart?.[0],
      periodEnd: flat.periodEnd?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  if (parsed.data.periodStart > parsed.data.periodEnd) {
    return hrmActionFailure({ form: "Period end must be on or after start." })
  }

  const publicationId = crypto.randomUUID()
  const publishedAt = new Date()

  await db.insert(hrmShiftRosterPublication).values({
    id: publicationId,
    organizationId: session.organizationId,
    periodStart: parsed.data.periodStart,
    periodEnd: parsed.data.periodEnd,
    publishedAt,
    publishedByUserId: session.userId,
    note: parsed.data.note,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.rosterPublish,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_roster_publication",
    resourceId: publicationId,
    metadata: {
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
    },
  })

  after(() =>
    notifyRosterPublished({
      organizationId: session.organizationId,
      publicationId,
      periodStart: parsed.data.periodStart,
      periodEnd: parsed.data.periodEnd,
      note: parsed.data.note,
    })
  )

  revalidateSftSurfaces()
  return { ok: true, publicationId }
}
