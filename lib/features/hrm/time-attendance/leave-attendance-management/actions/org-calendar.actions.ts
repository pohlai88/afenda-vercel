"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmLeaveBlackout, hrmOrgHoliday } from "#lib/db/schema"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

import { HRM_LAM_AUDIT } from "../hrm-lam.contract"
import { requireHrmAdmin } from "../../../_module-governance/hrm-admin-guard.server"
import {
  leaveBlackoutFormSchema,
  orgHolidayFormSchema,
} from "../schemas/org-calendar.schema"

function revalidatePolicies() {
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/policies"), "page")
  revalidatePath(toLocaleOrgAppsRevalidatePattern("/hrm/leave"), "page")
}

export type OrgCalendarMutationFormState =
  | { ok: true; id: string }
  | { ok: false; errors: Record<string, string | undefined> }

export async function createOrgHolidayAction(
  _prev: OrgCalendarMutationFormState | undefined,
  formData: FormData
): Promise<OrgCalendarMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = orgHolidayFormSchema.safeParse({
    holidayDate: formData.get("holidayDate"),
    name: formData.get("name"),
    regionCode: formData.get("regionCode") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        holidayDate: errs.holidayDate?.[0],
        name: errs.name?.[0],
        form: parsed.error.issues[0]?.message,
      },
    }
  }

  const id = crypto.randomUUID()
  const { data } = parsed

  try {
    await db.insert(hrmOrgHoliday).values({
      id,
      organizationId,
      holidayDate: data.holidayDate,
      name: data.name,
      regionCode: data.regionCode,
      createdByUserId: userId,
      updatedByUserId: userId,
    })
  } catch {
    return { ok: false, errors: { form: "Could not create company holiday." } }
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_LAM_AUDIT.orgHoliday.create,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_org_holiday",
    resourceId: id,
    metadata: { holidayDate: data.holidayDate, name: data.name },
  })

  revalidatePolicies()
  return { ok: true, id }
}

export async function createLeaveBlackoutAction(
  _prev: OrgCalendarMutationFormState | undefined,
  formData: FormData
): Promise<OrgCalendarMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const leaveTypeRaw = formData.get("leaveTypeId")
  const parsed = leaveBlackoutFormSchema.safeParse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    leaveTypeId:
      typeof leaveTypeRaw === "string" && leaveTypeRaw.length > 0
        ? leaveTypeRaw
        : null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        name: errs.name?.[0],
        startDate: errs.startDate?.[0],
        endDate: errs.endDate?.[0],
        form: parsed.error.issues[0]?.message,
      },
    }
  }

  const id = crypto.randomUUID()
  const { data } = parsed

  await db.insert(hrmLeaveBlackout).values({
    id,
    organizationId,
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    leaveTypeId: data.leaveTypeId,
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_LAM_AUDIT.blackout.create,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_leave_blackout",
    resourceId: id,
    metadata: {
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      leaveTypeId: data.leaveTypeId,
    },
  })

  revalidatePolicies()
  return { ok: true, id }
}

export async function archiveLeaveBlackoutAction(
  _prev: OrgCalendarMutationFormState | undefined,
  formData: FormData
): Promise<OrgCalendarMutationFormState> {
  const gate = await requireHrmAdmin()
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }
  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const blackoutId = formData.get("blackoutId")
  if (typeof blackoutId !== "string" || !blackoutId) {
    return { ok: false, errors: { form: "Blackout id is required." } }
  }

  await db
    .update(hrmLeaveBlackout)
    .set({ isActive: false, updatedAt: new Date(), updatedByUserId: userId })
    .where(
      and(
        eq(hrmLeaveBlackout.id, blackoutId),
        eq(hrmLeaveBlackout.organizationId, organizationId)
      )
    )

  await writeIamAuditEventFromNextHeaders({
    action: HRM_LAM_AUDIT.blackout.delete,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_leave_blackout",
    resourceId: blackoutId,
    metadata: {},
  })

  revalidatePolicies()
  return { ok: true, id: blackoutId }
}
