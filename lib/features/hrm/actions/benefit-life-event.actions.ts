"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmBenefitLifeEvent } from "#lib/db/schema"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"

import { getBenefitLifeEventForOrganization } from "../data/benefit.queries.server"
import { getEmployeeForOrganization } from "../data/employee.queries.server"
import { requireHrmAdmin } from "../data/hrm-admin-guard.server"
import {
  recordLifeEventFormSchema,
  verifyLifeEventFormSchema,
} from "../schemas/benefit.schema"
import { hrmActionFailure } from "../schemas/hrm-action-result.shared"
import type { RecordLifeEventFormState, VerifyLifeEventFormState } from "../types"

function revalidateBenefits() {
  revalidatePath(toLocaleOrgDashboardRevalidatePattern("/hrm/benefits"), "layout")
}

function parseIsoDateStart(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`)
}

// ---------------------------------------------------------------------------
// Tier B — qualifying life events (admin-gated)
// ---------------------------------------------------------------------------

export async function recordLifeEventAction(
  _prev: RecordLifeEventFormState | undefined,
  formData: FormData
): Promise<RecordLifeEventFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const docRaw = formData.get("documentIds")
  let documentIds: string[] = []
  if (typeof docRaw === "string" && docRaw.trim() !== "") {
    try {
      const parsedJson = JSON.parse(docRaw) as unknown
      if (Array.isArray(parsedJson)) {
        documentIds = parsedJson.map(String)
      }
    } catch {
      return hrmActionFailure({
        form: "documentIds must be a JSON array of UUID strings when provided.",
      })
    }
  }

  const parsed = recordLifeEventFormSchema.safeParse({
    employeeId: formData.get("employeeId"),
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate"),
    notes: formData.get("notes"),
    documentIds,
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      employeeId: fe.employeeId?.[0],
      eventType: fe.eventType?.[0],
      eventDate: fe.eventDate?.[0],
      notes: fe.notes?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const data = parsed.data

  const employee = await getEmployeeForOrganization(
    organizationId,
    data.employeeId
  )
  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }

  const [row] = await db
    .insert(hrmBenefitLifeEvent)
    .values({
      organizationId,
      employeeId: data.employeeId,
      eventType: data.eventType,
      eventDate: parseIsoDateStart(data.eventDate),
      notes: data.notes?.trim() ?? null,
      verificationStatus: "pending",
      documentIds: data.documentIds ?? [],
      createdByUserId: userId,
      updatedByUserId: userId,
    })
    .returning({ id: hrmBenefitLifeEvent.id })

  if (!row) {
    return hrmActionFailure({ form: "Could not record life event." })
  }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.benefit.life_event.record",
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_life_event",
      resourceId: row.id,
      metadata: {
        employeeId: data.employeeId,
        eventType: data.eventType,
      },
    })
  )

  revalidateBenefits()
  return { ok: true, lifeEventId: row.id }
}

export async function verifyLifeEventAction(
  _prev: VerifyLifeEventFormState | undefined,
  formData: FormData
): Promise<VerifyLifeEventFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = verifyLifeEventFormSchema.safeParse({
    lifeEventId: formData.get("lifeEventId"),
    verificationStatus: formData.get("verificationStatus"),
    verificationNote: formData.get("verificationNote"),
  })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      lifeEventId: fe.lifeEventId?.[0],
      verificationStatus: fe.verificationStatus?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const existing = await getBenefitLifeEventForOrganization(
    organizationId,
    parsed.data.lifeEventId
  )
  if (!existing) {
    return hrmActionFailure({ lifeEventId: "Life event not found." })
  }
  if (existing.verificationStatus !== "pending") {
    return hrmActionFailure({
      form: "Only pending life events can be verified or rejected.",
    })
  }

  const now = new Date()

  await db
    .update(hrmBenefitLifeEvent)
    .set({
      verificationStatus: parsed.data.verificationStatus,
      verifiedByUserId: userId,
      verifiedAt: now,
      verificationNote: parsed.data.verificationNote?.trim() ?? null,
      updatedByUserId: userId,
      updatedAt: now,
    })
    .where(
      and(
        eq(hrmBenefitLifeEvent.organizationId, organizationId),
        eq(hrmBenefitLifeEvent.id, parsed.data.lifeEventId)
      )
    )

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: "erp.hrm.benefit.life_event.verify",
      organizationId,
      actorUserId: userId,
      actorSessionId: sessionId,
      resourceType: "hrm_benefit_life_event",
      resourceId: parsed.data.lifeEventId,
      metadata: { decision: parsed.data.verificationStatus },
    })
  )

  revalidateBenefits()
  return { ok: true }
}
