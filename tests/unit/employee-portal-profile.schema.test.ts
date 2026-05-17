import { describe, expect, it } from "vitest"

import {
  portalBankingProfileFormSchema,
  portalEmergencyContactFormSchema,
  portalPersonalProfileFormSchema,
} from "../../lib/features/hrm/employee-management/employee-selfservice-portal/schemas/employee-portal-profile.schema"

describe("employee portal profile schemas", () => {
  it("accepts minimal personal profile payload", () => {
    const parsed = portalPersonalProfileFormSchema.safeParse({
      portalSlug: "acme-employee",
      preferredName: "Alex",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects invalid emergency email", () => {
    const parsed = portalEmergencyContactFormSchema.safeParse({
      portalSlug: "acme-employee",
      personalEmail: "not-an-email",
    })
    expect(parsed.success).toBe(false)
  })

  it("accepts banking update with tokenized account", () => {
    const parsed = portalBankingProfileFormSchema.safeParse({
      portalSlug: "acme-employee",
      bankCode: "MBB",
      bankAccountHolderName: "Alex Example",
      bankAccountTokenized: "tok_account_123",
    })
    expect(parsed.success).toBe(true)
  })
})
