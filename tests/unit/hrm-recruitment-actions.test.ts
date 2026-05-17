import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireHrmOrgTenantFromForm: vi.fn(),
  requireHrmPermission: vi.fn(),
  assertOptionalHrmPlacementFkBelongsToOrg: vi.fn(),
  insertValues: vi.fn(),
  writeIamAuditEventFromNextHeaders: vi.fn(),
  revalidatePath: vi.fn(),
  after: vi.fn((callback: () => unknown) => callback()),
}))

vi.mock("server-only", () => ({}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("next/server", () => ({
  after: mocks.after,
}))

vi.mock("#lib/auth", () => ({
  writeIamAuditEventFromNextHeaders: mocks.writeIamAuditEventFromNextHeaders,
}))

vi.mock("#lib/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: mocks.insertValues,
    })),
  },
}))

vi.mock("../../lib/features/hrm/hrm-action-guard.server.ts", () => ({
  requireHrmOrgTenantFromForm: mocks.requireHrmOrgTenantFromForm,
}))

vi.mock("../../lib/features/hrm/hrm-admin-guard.server.ts", () => ({
  requireHrmPermission: mocks.requireHrmPermission,
}))

vi.mock("../../lib/features/hrm/hrm-org-fk.server.ts", () => ({
  assertOptionalHrmPlacementFkBelongsToOrg:
    mocks.assertOptionalHrmPlacementFkBelongsToOrg,
}))

import { createJobRequisitionAction } from "../../lib/features/hrm/talent-management/recruitment-applicant-tracking/actions/recruitment.actions"

function buildForm(fields: Record<string, string>) {
  const formData = new FormData()
  const merged = { requiredSkillCodes: "", ...fields }
  for (const [key, value] of Object.entries(merged)) {
    formData.set(key, value)
  }
  return formData
}

describe("recruitment Server Actions", () => {
  beforeEach(() => {
    mocks.requireHrmOrgTenantFromForm.mockReset()
    mocks.requireHrmPermission.mockReset()
    mocks.assertOptionalHrmPlacementFkBelongsToOrg.mockReset()
    mocks.insertValues.mockReset()
    mocks.writeIamAuditEventFromNextHeaders.mockReset()
    mocks.revalidatePath.mockReset()
    mocks.after.mockClear()

    mocks.requireHrmOrgTenantFromForm.mockResolvedValue({
      ok: false,
      response: { ok: false, errors: { form: "Bad org slug." } },
    })
    mocks.requireHrmPermission.mockResolvedValue({
      ok: true,
      session: { organizationId: "org-1" },
    })
    mocks.assertOptionalHrmPlacementFkBelongsToOrg.mockResolvedValue({
      ok: true,
    })
    mocks.insertValues.mockResolvedValue(undefined)
  })

  it("returns tenant guard failure without touching the database", async () => {
    const fd = buildForm({ orgSlug: "evil", title: "Role" })
    const result = await createJobRequisitionAction(undefined, fd)
    expect(result).toEqual({
      ok: false,
      errors: { form: "Bad org slug." },
    })
    expect(mocks.insertValues).not.toHaveBeenCalled()
  })

  it("returns validation failure when title is empty", async () => {
    mocks.requireHrmOrgTenantFromForm.mockResolvedValue({
      ok: true,
      orgSlug: "acme",
      session: {
        organizationId: "org-1",
        userId: "user-1",
        sessionId: "sess-1",
      },
    })
    mocks.requireHrmPermission.mockResolvedValue({
      ok: true,
      session: { organizationId: "org-1" },
    })

    const fd = buildForm({ orgSlug: "acme", title: "" })
    const result = await createJobRequisitionAction(undefined, fd)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.form).toBeTruthy()
    }
    expect(mocks.insertValues).not.toHaveBeenCalled()
  })

  it("inserts a draft requisition when tenant, permission, and payload are valid", async () => {
    mocks.requireHrmOrgTenantFromForm.mockResolvedValue({
      ok: true,
      orgSlug: "acme",
      session: {
        organizationId: "org-1",
        userId: "user-1",
        sessionId: "sess-1",
      },
    })
    mocks.requireHrmPermission.mockResolvedValue({
      ok: true,
      session: { organizationId: "org-1" },
    })

    const idSpy = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")

    try {
      const fd = buildForm({
        orgSlug: "acme",
        title: "Platform engineer",
        departmentId: "",
        headcount: "1",
      })
      const result = await createJobRequisitionAction(undefined, fd)
      expect(result).toEqual({
        ok: true,
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      })
      expect(mocks.insertValues).toHaveBeenCalled()
      expect(mocks.revalidatePath).toHaveBeenCalled()
      expect(mocks.after).toHaveBeenCalled()
    } finally {
      idSpy.mockRestore()
    }
  })
})
