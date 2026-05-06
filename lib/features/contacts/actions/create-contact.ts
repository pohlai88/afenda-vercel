"use server"

import { revalidatePath } from "next/cache"

import { db } from "#lib/db"
import { customers } from "#lib/db/schema"
import { contactSchema } from "#features/contacts/schemas/contact.schema"
import type { CreateContactFormState } from "#features/contacts/types"
import { requireOrgSession } from "#lib/tenant"

export async function createContact(
  _prevState: CreateContactFormState,
  formData: FormData,
): Promise<CreateContactFormState> {
  const { organizationId } = await requireOrgSession()

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
    await db.insert(customers).values({
      organizationId,
      name: parsed.data.name,
      email,
    })
  } catch {
    return {
      ok: false,
      errors: {
        form: "Could not save contact. Try again.",
      },
    }
  }

  revalidatePath("/dashboard/contacts")
  return { ok: true }
}
