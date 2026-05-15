"use server"

import { after } from "next/server"
import { redirect } from "next/navigation"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import { insertPlannerAttachment } from "../data/planner.mutations.server"
import { addPlannerAttachmentMetadataFormSchema } from "../domain/planner.schemas"
import {
  orbitScopedPath,
  orbitStatusPath,
  readPlannerActionOrgSlug,
  readPlannerActionScopeKind,
  readPlannerActionSurface,
  revalidateOrbitScope,
} from "./planner-action.shared"

export async function addPlannerAttachmentAction(
  formData: FormData
): Promise<void> {
  const scopeKind = readPlannerActionScopeKind(formData)
  const surface = readPlannerActionSurface(formData, "queue")
  const orgSlug = readPlannerActionOrgSlug(formData)
  const locale = await getRequestAppLocale()

  const parsed = addPlannerAttachmentMetadataFormSchema.safeParse({
    itemId: formData.get("itemId"),
    blobUrl: formData.get("blobUrl"),
    payloadHash: formData.get("payloadHash"),
    mimeType: formData.get("mimeType"),
    sizeBytes: formData.get("sizeBytes"),
  })

  if (!parsed.success) {
    const href = orbitScopedPath({ scopeKind, orgSlug, surface })
    redirect(toLocalePath(locale, `${href}?status=invalidInput`))
  }

  const session = await requireOrgSession()
  const row = await insertPlannerAttachment({
    scope: {
      scopeKind: "organization",
      organizationId: session.organizationId,
    },
    itemId: parsed.data.itemId,
    url: parsed.data.blobUrl,
    contentSha256: parsed.data.payloadHash,
    mimeType: parsed.data.mimeType,
    sizeBytes: parsed.data.sizeBytes,
    actorUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: buildPlannerAuditAction("attachment", "attach"),
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "planner_attachment",
      resourceId: row.attachmentId,
      metadata: {
        itemId: parsed.data.itemId,
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
        surface,
        status: "attachmentAdded",
        focusKind: "item",
        focusId: parsed.data.itemId,
      })
    )
  )
}
