"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { customers } from "#lib/db/schema"
import { requireErpPermission } from "#features/erp-rbac/server"
import { contactSchema } from "#features/contacts/schemas/contact.schema"
import type { CreateContactFormState } from "#features/contacts/types"
import { ORG_APPS_CONTACTS } from "#lib/org-apps-module-paths"
import { toLocaleOrgAppsRevalidatePattern } from "#lib/i18n/locales.shared"

export async function createContact(
  _prevState: CreateContactFormState,
  formData: FormData
): Promise<CreateContactFormState> {
  const gate = await requireErpPermission({
    module: "contacts",
    object: "record",
    function: "create",
  })
  if (!gate.ok) {
    return { ok: false, errors: { form: gate.error } }
  }
  const { organizationId, userId, sessionId } = gate.session

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email") || "",
  })

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
      },
    }
  }

  const email =
    parsed.data.email && parsed.data.email.length > 0 ? parsed.data.email : null

  try {
    const [row] = await db
      .insert(customers)
      .values({
        organizationId,
        name: parsed.data.name,
        email,
      })
      .returning({ id: customers.id })

    after(() =>
      writeIamAuditEventFromNextHeaders({
        action: "erp.contact.record.create",
        organizationId,
        actorUserId: userId,
        actorSessionId: sessionId,
        resourceType: "contact.record",
        resourceId: row.id,
        metadata: {
          name: parsed.data.name,
          hasEmail: Boolean(email),
        },
      })
    )
  } catch {
    return {
      ok: false,
      errors: {
        form: "Could not save contact. Try again.",
      },
    }
  }

  revalidatePath(toLocaleOrgAppsRevalidatePattern(ORG_APPS_CONTACTS), "page")
  return { ok: true }
}
