"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { parsePlannerCaptureInput } from "./planner-capture-parser.shared"
import { insertPlannerCapturedItem } from "../data/planner.mutations.server"
import { capturePlannerItemFormSchema } from "../domain/planner.schemas"
import {
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function capturePlannerItemAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const orgSlug = readPlannerActionOrgSlug(formData)
  const parsed = capturePlannerItemFormSchema.safeParse({
    rawText: formData.get("rawText"),
    scopeKind,
    surface: formData.get("surface") ?? undefined,
    orgSlug: orgSlug ?? undefined,
    timeZone: formData.get("timeZone") ?? undefined,
  })
  const locale = await getRequestAppLocale()

  if (!parsed.success) {
    redirect(
      toLocalePath(
        locale,
        orbitStatusPath({
          scopeKind: "organization",
          orgSlug: null,
          surface: "queue",
          status: "invalidInput",
        })
      )
    )
  }

  const capture = parsePlannerCaptureInput(parsed.data.rawText, {
    timeZone: parsed.data.timeZone,
  })
  if (capture.title.length === 0 || capture.warnings.includes("empty_title")) {
    redirect(
      toLocalePath(
        locale,
        orbitStatusPath({
          scopeKind,
          orgSlug,
          surface: parsed.data.surface,
          status: "invalidInput",
        })
      )
    )
  }

  const session = await requireOrgSession()
  const row = await insertPlannerCapturedItem({
    scope: {
      scopeKind: "organization",
      organizationId: session.organizationId,
    },
    title: capture.title,
    dueAt: capture.dueAt,
    reminder: capture.reminder,
    recurrence: capture.recurrence,
    timeZone: parsed.data.timeZone,
    actorUserId: session.userId,
    pressure: {},
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("item", "create"),
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_item",
      resourceId: row.id,
      organizationId: session.organizationId,
      metadata: {
        scopeKind,
        capture: {
          confidence: capture.confidence,
          warnings: capture.warnings,
          hasDueAt: Boolean(capture.dueAt),
          hasReminder: Boolean(capture.reminder),
          hasRecurrence: Boolean(capture.recurrence),
        },
      },
    })
  )

  revalidateOrbitScope(scopeKind)
  redirect(
    toLocalePath(
      locale,
      orbitStatusPath({
        scopeKind,
        orgSlug,
        surface: parsed.data.surface,
        status: "createdItem",
        focusKind: "item",
        focusId: row.id,
      })
    )
  )
}
