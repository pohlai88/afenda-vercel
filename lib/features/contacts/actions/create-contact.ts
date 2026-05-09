"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { customers } from "#lib/db/schema"
import { contactSchema } from "#features/contacts/schemas/contact.schema"
import type { CreateContactFormState } from "#features/contacts/types"
import { ORG_DASHBOARD_CONTACTS } from "#lib/dashboard-module-paths"
import { toLocaleOrgDashboardRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

export async function createContact(
  _prevState: CreateContactFormState,
  formData: FormData
): Promise<CreateContactFormState> {
  // Tier B (standard CRUD): org membership via requireOrgSession; not admin-guarded master data.
  const { organizationId, userId, sessionId } = await requireOrgSession()

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

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_CONTACTS),
    "page"
  )
  return { ok: true }
}
