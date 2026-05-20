import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmOvertimeType } from "#lib/db/schema"

import { HRM_OTM_AUDIT } from "../otm.contract"
import type { HrmOtmDayCategory } from "../schemas/otm.schema"
import { revalidateOtmSurfaces } from "./otm-revalidate.server"

export async function createOtmType(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  code: string
  label: string
  dayCategory: HrmOtmDayCategory
  description: string | null
}): Promise<
  | { ok: true; typeId: string }
  | { ok: false; errors: { code?: string; form?: string } }
> {
  const existing = await db.query.hrmOvertimeType.findFirst({
    where: and(
      eq(hrmOvertimeType.organizationId, input.organizationId),
      eq(hrmOvertimeType.code, input.code)
    ),
    columns: { id: true },
  })

  if (existing) {
    return { ok: false, errors: { code: "A type with this code already exists." } }
  }

  const typeId = crypto.randomUUID()

  await db.insert(hrmOvertimeType).values({
    id: typeId,
    organizationId: input.organizationId,
    code: input.code,
    label: input.label,
    dayCategory: input.dayCategory,
    description: input.description,
    createdByUserId: input.userId,
    updatedByUserId: input.userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_OTM_AUDIT.typeCreate,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_overtime_type",
    resourceId: typeId,
    metadata: { code: input.code, dayCategory: input.dayCategory },
  })

  revalidateOtmSurfaces()
  return { ok: true, typeId }
}

export async function seedDefaultOtmTypes(input: {
  organizationId: string
  userId: string
  sessionId: string | null
}): Promise<{ seeded: string[]; skipped: string[] }> {
  const defaults: {
    code: string
    label: string
    dayCategory: HrmOtmDayCategory
    description: string
  }[] = [
    {
      code: "OT_NORMAL",
      label: "Normal day overtime",
      dayCategory: "normal_day",
      description: "Standard weekday overtime.",
    },
    {
      code: "OT_REST",
      label: "Rest day overtime",
      dayCategory: "rest_day",
      description: "Overtime on a rest day.",
    },
    {
      code: "OT_OFF",
      label: "Off day overtime",
      dayCategory: "off_day",
      description: "Overtime on an off day.",
    },
    {
      code: "OT_HOLIDAY",
      label: "Public holiday overtime",
      dayCategory: "public_holiday",
      description: "Overtime on a public holiday.",
    },
    {
      code: "OT_NIGHT",
      label: "Night overtime",
      dayCategory: "night",
      description: "Night-shift overtime.",
    },
    {
      code: "OT_EMERGENCY",
      label: "Emergency overtime",
      dayCategory: "emergency",
      description: "Unplanned emergency overtime.",
    },
  ]

  const seeded: string[] = []
  const skipped: string[] = []

  for (const row of defaults) {
    const existing = await db.query.hrmOvertimeType.findFirst({
      where: and(
        eq(hrmOvertimeType.organizationId, input.organizationId),
        eq(hrmOvertimeType.code, row.code)
      ),
      columns: { id: true },
    })

    if (existing) {
      skipped.push(row.code)
      continue
    }

    const typeId = crypto.randomUUID()
    await db.insert(hrmOvertimeType).values({
      id: typeId,
      organizationId: input.organizationId,
      code: row.code,
      label: row.label,
      dayCategory: row.dayCategory,
      description: row.description,
      createdByUserId: input.userId,
      updatedByUserId: input.userId,
    })

    await writeIamAuditEventFromNextHeaders({
      action: HRM_OTM_AUDIT.typeCreate,
      actorUserId: input.userId,
      actorSessionId: input.sessionId,
      organizationId: input.organizationId,
      resourceType: "hrm_overtime_type",
      resourceId: typeId,
      metadata: { code: row.code, seeded: true },
    })

    seeded.push(row.code)
  }

  if (seeded.length > 0) {
    revalidateOtmSurfaces()
  }

  return { seeded, skipped }
}
