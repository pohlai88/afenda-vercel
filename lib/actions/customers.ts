"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireOrgSession } from "#lib/tenant"
import { db } from "#lib/db"
import { customers } from "#lib/db/schema"

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
})

export type CreateCustomerFormState =
  | undefined
  | { ok: true }
  | {
      ok: false
      errors: Partial<Record<"name" | "email" | "form", string>>
    }

export async function createCustomer(
  _prevState: CreateCustomerFormState,
  formData: FormData,
): Promise<CreateCustomerFormState> {
  const { organizationId } = await requireOrgSession()

  const parsed = createCustomerSchema.safeParse({
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
    parsed.data.email && parsed.data.email.length > 0
      ? parsed.data.email
      : null

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
        form: "Could not save customer. Try again.",
      },
    }
  }

  revalidatePath("/dashboard")
  return { ok: true }
}
