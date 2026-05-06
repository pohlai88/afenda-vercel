export type CreateContactFormState =
  | undefined
  | { ok: true }
  | {
      ok: false
      errors: Partial<Record<"name" | "email" | "form", string>>
    }

export type ContactRow = {
  id: string
  name: string
  email: string | null
  createdAt: Date
}
