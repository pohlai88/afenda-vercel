import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("#lib/auth", () => ({
  writeIamAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

import { writeIamAuditEvent } from "#lib/auth"

import { writeAuditEvent7W1H } from "#lib/erp/audit-7w1h.server"

import { auditEvent7W1HSchema } from "#lib/erp/audit-7w1h.shared"

describe("audit-7w1h.server", () => {
  beforeEach(() => {
    vi.mocked(writeIamAuditEvent).mockClear()
  })

  it("throws on invalid 7W1H event", async () => {
    await expect(
      writeAuditEvent7W1H({
        event: {
          who: "",
          what: "x",
          when: new Date().toISOString(),
          where: "y",
          why: "",
          which: "z",
          whom: "a",
          how: "system",
          action: "erp.planner.item.resolve",
        },
        iam: {
          resourceType: "planner_item",
          resourceId: "id-1",
        },
      })
    ).rejects.toThrow(/invalid event/)
  })

  it("writes IAM audit and returns trimmed cache", async () => {
    const event = auditEvent7W1HSchema.parse({
      who: "System",
      what: "Recorded intake",
      when: "2026-05-09T08:00:00.000Z",
      where: "Purchase",
      why: "Audit trail",
      which: "PO-1",
      whom: "AP",
      how: "server-action",
      action: "erp.planner.item.create",
    })

    let persisted: (typeof event)[] | null = null
    const { trimmed } = await writeAuditEvent7W1H({
      event,
      iam: {
        actorUserId: "u1",
        organizationId: "o1",
        resourceType: "planner_item",
        resourceId: "id-1",
        metadata: { source: "test" },
      },
      existingCache: [],
      cacheUpdater: async (next) => {
        persisted = next
      },
    })

    expect(vi.mocked(writeIamAuditEvent)).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "erp.planner.item.create",
        actorUserId: "u1",
        organizationId: "o1",
        resourceType: "planner_item",
        resourceId: "id-1",
      })
    )
    expect(trimmed).toHaveLength(1)
    expect(persisted).toEqual(trimmed)
  })
})
