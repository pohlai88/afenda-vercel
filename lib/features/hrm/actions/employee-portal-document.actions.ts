"use server"

import { z } from "zod"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"

import { getEmployeePortalContext } from "../data/employee-portal-access.server"
import { EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR } from "../data/employee-portal-access.shared"

const requestDocumentFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  notes: z.string().trim().max(2000).optional().nullable(),
})

export type PortalDocumentRequestFormState =
  | { ok: true }
  | { ok: false; errors: { title?: string; notes?: string; form?: string } }

export async function requestPortalEmployeeDocumentAction(
  _prev: PortalDocumentRequestFormState | undefined,
  formData: FormData
): Promise<PortalDocumentRequestFormState> {
  const rawPortalSlug = formData.get("portalSlug")
  if (typeof rawPortalSlug !== "string" || rawPortalSlug.trim() === "") {
    return {
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    }
  }

  const context = await getEmployeePortalContext(rawPortalSlug)
  if (!context) {
    return {
      ok: false,
      errors: { form: EMPLOYEE_PORTAL_ACCESS_UNAVAILABLE_ERROR },
    }
  }

  const parsed = requestDocumentFormSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || null,
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        title: flat.title?.[0],
        notes: flat.notes?.[0],
        form: parsed.error.issues[0]?.message,
      },
    }
  }

  const requestId = crypto.randomUUID()

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.document.create",
    actorUserId: context.portal.userId,
    actorSessionId: context.portal.sessionId,
    organizationId: context.portal.organizationId,
    resourceType: "hrm_document_request",
    resourceId: requestId,
    metadata: {
      portal: true,
      employeeId: context.employee.id,
      title: parsed.data.title,
      notes: parsed.data.notes ?? null,
    },
  })

  return { ok: true }
}
