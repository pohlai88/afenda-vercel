import { describe, expect, it } from "vitest"

import {
  RAIL_MEMORY_AUDIT_ACTIONS,
  RAIL_MEMORY_RESOURCE_TYPES,
  RAIL_PIN_LIMIT_PER_WORKBENCH,
  RAIL_RECENT_QUERY_LIMIT,
  RAIL_RECENT_RATE_LIMIT_SECONDS,
  RAIL_RECENT_RETENTION_LIMIT,
  RAIL_RECENT_SURFACE_LIMIT,
  RAIL_VIEW_LIMIT_PER_WORKBENCH,
  WORKBENCH_IDS,
  WORKBENCH_REVALIDATE_PATTERNS,
  isWorkbenchId,
  type WorkbenchId,
} from "#features/rail-memory"

import {
  dedupeRecents,
  pinDtoToSlot,
  pinRowToDto,
  recentDtoToSlot,
  recentRowToDto,
  viewDtoToSlot,
  viewRowToDto,
} from "../../lib/features/rail-memory/data/mappers.shared"
import {
  pinRecordInputSchema,
  reorderPinsInputSchema,
  unpinRecordInputSchema,
} from "../../lib/features/rail-memory/schemas/pin-input.schema"
import { recordRecentVisitInputSchema } from "../../lib/features/rail-memory/schemas/recent-input.schema"
import {
  deleteViewInputSchema,
  saveViewInputSchema,
  updateViewInputSchema,
} from "../../lib/features/rail-memory/schemas/view-input.schema"

// ---------------------------------------------------------------------------
// Module constants — locked invariants
// ---------------------------------------------------------------------------

describe("rail-memory constants", () => {
  it("WORKBENCH_IDS tuple matches the typed WorkbenchId union exactly", () => {
    // Compile-time check via `satisfies` already enforces this; this
    // test pins the runtime value so a future rename of `WorkbenchId`
    // that the satisfies happens to still pass (e.g. additive-only)
    // does not silently drop a member.
    expect(WORKBENCH_IDS).toStrictEqual([
      "account",
      "org-admin",
      "hrm",
      "platform-admin",
    ])
    // Doctrinal: the tuple is read as `as const` and consumed by Zod
    // `z.enum()` — it MUST stay a frozen-shape tuple, not a `string[]`.
    expect(Object.isFrozen(WORKBENCH_IDS)).toBe(false) // `as const` is type-only
    expect(WORKBENCH_IDS.length).toBe(4)
  })

  it("isWorkbenchId narrows known ids and rejects everything else", () => {
    for (const id of WORKBENCH_IDS) {
      expect(isWorkbenchId(id)).toBe(true)
    }
    expect(isWorkbenchId("orbit")).toBe(false)
    expect(isWorkbenchId("ORG-ADMIN")).toBe(false)
    expect(isWorkbenchId("")).toBe(false)
    expect(isWorkbenchId(undefined)).toBe(false)
    expect(isWorkbenchId(null)).toBe(false)
    expect(isWorkbenchId(123)).toBe(false)
    expect(isWorkbenchId({ id: "hrm" })).toBe(false)
  })

  it("audit action grammar is the doctrinal iam.workbench.* set", () => {
    // Lock the public contract — log drains + audit dashboards depend
    // on these stable strings; a rename is a breaking change that must
    // surface here, not silently in production.
    expect(RAIL_MEMORY_AUDIT_ACTIONS).toStrictEqual({
      PIN_CREATE: "iam.workbench.pin.create",
      PIN_DELETE: "iam.workbench.pin.delete",
      PIN_REORDER: "iam.workbench.pin.reorder",
      VIEW_CREATE: "iam.workbench.view.create",
      VIEW_UPDATE: "iam.workbench.view.update",
      VIEW_DELETE: "iam.workbench.view.delete",
    })
    // Every emitted action must live under the iam.workbench.*
    // namespace per AGENTS §5 (personal operator state).
    for (const value of Object.values(RAIL_MEMORY_AUDIT_ACTIONS)) {
      expect(value.startsWith("iam.workbench.")).toBe(true)
    }
  })

  it("audit resource types match the Drizzle table names", () => {
    expect(RAIL_MEMORY_RESOURCE_TYPES).toStrictEqual({
      PIN: "rail_pinned_item",
      VIEW: "rail_saved_view",
    })
  })

  it("recent caps form a coherent throughput envelope", () => {
    // Surface ≤ retention ≤ query sample — violating this would
    // either render duplicates (sample < surface) or waste reads
    // (sample > retention by an order of magnitude).
    expect(RAIL_RECENT_SURFACE_LIMIT).toBeLessThanOrEqual(
      RAIL_RECENT_RETENTION_LIMIT
    )
    expect(RAIL_RECENT_RETENTION_LIMIT).toBeLessThanOrEqual(
      RAIL_RECENT_QUERY_LIMIT
    )
    expect(RAIL_RECENT_RATE_LIMIT_SECONDS).toBeGreaterThan(0)
    expect(RAIL_RECENT_RATE_LIMIT_SECONDS).toBeLessThanOrEqual(60)
  })

  it("pin / view caps are scannable, not pseudo-unlimited", () => {
    expect(RAIL_PIN_LIMIT_PER_WORKBENCH).toBe(30)
    expect(RAIL_VIEW_LIMIT_PER_WORKBENCH).toBe(30)
  })
})

// ---------------------------------------------------------------------------
// Pin input schemas
// ---------------------------------------------------------------------------

describe("pinRecordInputSchema", () => {
  const valid = {
    workbenchId: "hrm" as WorkbenchId,
    resourceType: "hrm_employee",
    resourceId: "00000000-0000-0000-0000-0000000000aa",
    label: "Sarah Chen",
    href: "/o/acme/dashboard/hrm/employees/00000000-0000-0000-0000-0000000000aa",
    icon: "user",
  }

  it("accepts a well-formed input", () => {
    const parsed = pinRecordInputSchema.parse(valid)
    // lane defaults to "pinned" when omitted
    expect(parsed).toStrictEqual({ ...valid, lane: "pinned" })
  })

  it("makes icon optional", () => {
    const { icon: _icon, ...withoutIcon } = valid
    const parsed = pinRecordInputSchema.parse(withoutIcon)
    expect(parsed.icon).toBeUndefined()
  })

  it("accepts explicit lane values", () => {
    for (const lane of ["pinned", "urgent", "todo"] as const) {
      expect(pinRecordInputSchema.parse({ ...valid, lane }).lane).toBe(lane)
    }
  })

  it("rejects unknown lane values", () => {
    expect(() =>
      pinRecordInputSchema.parse({ ...valid, lane: "archive" })
    ).toThrow()
  })

  it("rejects unknown workbenchId", () => {
    expect(() =>
      pinRecordInputSchema.parse({ ...valid, workbenchId: "orbit" })
    ).toThrow()
  })

  it("rejects empty label / resourceId / href", () => {
    for (const field of ["label", "resourceId", "href"] as const) {
      expect(() =>
        pinRecordInputSchema.parse({ ...valid, [field]: "" })
      ).toThrow()
      expect(() =>
        pinRecordInputSchema.parse({ ...valid, [field]: "   " })
      ).toThrow()
    }
  })

  it("rejects extra keys (strict)", () => {
    expect(() => pinRecordInputSchema.parse({ ...valid, foo: "bar" })).toThrow()
  })

  it("trims label / href / resourceType", () => {
    const parsed = pinRecordInputSchema.parse({
      ...valid,
      label: "  Sarah Chen  ",
      href: "  /x  ",
      resourceType: "  hrm_employee  ",
    })
    expect(parsed.label).toBe("Sarah Chen")
    expect(parsed.href).toBe("/x")
    expect(parsed.resourceType).toBe("hrm_employee")
  })
})

describe("unpinRecordInputSchema", () => {
  it("accepts a single pin id", () => {
    expect(unpinRecordInputSchema.parse({ pinId: "abc" }).pinId).toBe("abc")
  })

  it("rejects empty / missing pin id", () => {
    expect(() => unpinRecordInputSchema.parse({ pinId: "" })).toThrow()
    expect(() => unpinRecordInputSchema.parse({})).toThrow()
  })
})

describe("reorderPinsInputSchema", () => {
  it("accepts a non-empty ordered list of ids", () => {
    const parsed = reorderPinsInputSchema.parse({
      workbenchId: "hrm",
      orderedPinIds: ["p1", "p2", "p3"],
    })
    expect(parsed.orderedPinIds).toStrictEqual(["p1", "p2", "p3"])
  })

  it("rejects empty list (a partial reorder is still rejected by the action layer)", () => {
    expect(() =>
      reorderPinsInputSchema.parse({
        workbenchId: "hrm",
        orderedPinIds: [],
      })
    ).toThrow()
  })

  it("caps the list at 64 ids", () => {
    const tooMany = Array.from({ length: 65 }, (_, i) => `id-${i}`)
    expect(() =>
      reorderPinsInputSchema.parse({
        workbenchId: "hrm",
        orderedPinIds: tooMany,
      })
    ).toThrow()
  })
})

// ---------------------------------------------------------------------------
// View input schemas
// ---------------------------------------------------------------------------

describe("saveViewInputSchema", () => {
  it("accepts the canonical filtered URL shape", () => {
    const parsed = saveViewInputSchema.parse({
      workbenchId: "hrm",
      label: "New hires this month",
      href: "/o/acme/dashboard/hrm/employees?status=hired&since=30d",
    })
    expect(parsed.label).toBe("New hires this month")
  })

  it("rejects unknown workbench", () => {
    expect(() =>
      saveViewInputSchema.parse({
        workbenchId: "operator",
        label: "x",
        href: "/y",
      })
    ).toThrow()
  })
})

describe("updateViewInputSchema", () => {
  it("accepts a label-only partial", () => {
    const parsed = updateViewInputSchema.parse({
      viewId: "v1",
      label: "renamed",
    })
    expect(parsed.label).toBe("renamed")
    expect(parsed.href).toBeUndefined()
  })

  it("accepts icon: null as the explicit clear sentinel", () => {
    const parsed = updateViewInputSchema.parse({
      viewId: "v1",
      icon: null,
    })
    expect(parsed.icon).toBeNull()
  })

  it("rejects empty-update payloads (no field present)", () => {
    expect(() => updateViewInputSchema.parse({ viewId: "v1" })).toThrow()
  })

  it("rejects extra keys", () => {
    expect(() =>
      updateViewInputSchema.parse({
        viewId: "v1",
        label: "x",
        rank: 99,
      })
    ).toThrow()
  })
})

describe("deleteViewInputSchema", () => {
  it("accepts a single id", () => {
    expect(deleteViewInputSchema.parse({ viewId: "v1" }).viewId).toBe("v1")
  })
  it("rejects empty", () => {
    expect(() => deleteViewInputSchema.parse({ viewId: "" })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// Recent input schema
// ---------------------------------------------------------------------------

describe("recordRecentVisitInputSchema", () => {
  const base = {
    organizationId: "org-1",
    userId: "user-1",
    workbenchId: "hrm" as WorkbenchId,
    resourceType: "hrm_employee",
    label: "Sarah Chen",
    href: "/o/acme/dashboard/hrm/employees/abc",
  }

  it("accepts a record-level visit (resourceId present)", () => {
    const parsed = recordRecentVisitInputSchema.parse({
      ...base,
      resourceId: "abc",
    })
    expect(parsed.resourceId).toBe("abc")
  })

  it("accepts a list-level visit (resourceId omitted)", () => {
    const parsed = recordRecentVisitInputSchema.parse(base)
    expect(parsed.resourceId).toBeUndefined()
  })

  it("rejects unknown workbench ids", () => {
    expect(() =>
      recordRecentVisitInputSchema.parse({ ...base, workbenchId: "orbit" })
    ).toThrow()
  })

  it("trims label / href / resourceType but rejects empty post-trim", () => {
    expect(() =>
      recordRecentVisitInputSchema.parse({ ...base, label: "   " })
    ).toThrow()
    expect(() =>
      recordRecentVisitInputSchema.parse({ ...base, href: "   " })
    ).toThrow()
  })

  it("rejects audit-namespace labels — continuity memory, not audit logs", () => {
    // Defense in depth. The same refinement lives on the kernel
    // `workbenchRailRecentSchema.label`; this test asserts it also
    // applies at the writer boundary so a misguided RSC caller cannot
    // persist a row the renderer would later reject.
    const forbidden = [
      "iam.user.role.update",
      "org.import.job.create",
      "erp.contact.record.create",
      "governance.audit.export.run",
      "integration.endpoint.delete",
      "workflow.run.complete",
      "system.cron.tick",
    ]
    for (const label of forbidden) {
      expect(() =>
        recordRecentVisitInputSchema.parse({ ...base, label })
      ).toThrow()
    }
  })

  it("accepts ergonomic prose that just happens to contain a namespace prefix word", () => {
    // Sanity: the whole-token boundary (`prefix.`) means "ergonomics"
    // and "organic" remain valid labels. A previous regression would
    // have refused them.
    const accepted = recordRecentVisitInputSchema.parse({
      ...base,
      label: "Ergonomics review · edited 12m ago",
    })
    expect(accepted.label).toContain("Ergonomics")
  })
})

// ---------------------------------------------------------------------------
// Mappers — DB row → DTO
// ---------------------------------------------------------------------------

describe("pinRowToDto", () => {
  const row = {
    id: "pin-1",
    organizationId: "org-1",
    userId: "user-1",
    workbenchId: "hrm",
    resourceType: "hrm_employee",
    resourceId: "emp-1",
    label: "Sarah Chen",
    href: "/o/acme/dashboard/hrm/employees/emp-1",
    icon: "user",
    lane: "pinned",
    rank: 0,
    createdAt: new Date("2026-05-12T10:00:00.000Z"),
  }

  it("maps a well-formed row", () => {
    const dto = pinRowToDto(row)
    expect(dto).not.toBeNull()
    expect(dto!.workbenchId).toBe("hrm")
    expect(dto!.icon).toBe("user")
  })

  it("returns null for a stale workbenchId (self-healing)", () => {
    expect(
      pinRowToDto({ ...row, workbenchId: "old-removed-workbench" })
    ).toBeNull()
  })

  it("coerces null / blank icon to null", () => {
    expect(pinRowToDto({ ...row, icon: null })!.icon).toBeNull()
    expect(pinRowToDto({ ...row, icon: "   " })!.icon).toBeNull()
  })

  it("maps lane through to the DTO", () => {
    expect(pinRowToDto({ ...row, lane: "urgent" })!.lane).toBe("urgent")
  })

  it("coerces unknown lane values to 'pinned'", () => {
    expect(pinRowToDto({ ...row, lane: "archive" })!.lane).toBe("pinned")
  })
})

describe("viewRowToDto", () => {
  const row = {
    id: "view-1",
    organizationId: "org-1",
    userId: "user-1",
    workbenchId: "org-admin",
    label: "Active members",
    href: "/o/acme/admin/members?status=active",
    icon: "users",
    rank: 0,
    createdAt: new Date("2026-05-12T10:00:00.000Z"),
    updatedAt: new Date("2026-05-12T10:00:00.000Z"),
  }

  it("maps a well-formed row", () => {
    expect(viewRowToDto(row)?.workbenchId).toBe("org-admin")
  })

  it("returns null on stale workbench", () => {
    expect(viewRowToDto({ ...row, workbenchId: "ghost" })).toBeNull()
  })
})

describe("recentRowToDto", () => {
  const row = {
    id: "rec-1",
    organizationId: "org-1",
    userId: "user-1",
    workbenchId: "hrm",
    resourceType: "hrm_employee",
    resourceId: "emp-1",
    label: "Sarah Chen",
    href: "/x",
    icon: null,
    occurredAt: new Date("2026-05-12T10:00:00.000Z"),
  }

  it("maps record-level recents", () => {
    expect(recentRowToDto(row)?.resourceId).toBe("emp-1")
  })

  it("preserves resourceId: null for list-level recents", () => {
    expect(recentRowToDto({ ...row, resourceId: null })?.resourceId).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Mappers — DTO → kernel slot
// ---------------------------------------------------------------------------

describe("pinDtoToSlot", () => {
  it("emits a kernel WorkbenchRailPin shape", () => {
    const slot = pinDtoToSlot({
      id: "p1",
      workbenchId: "hrm",
      resourceType: "hrm_employee",
      resourceId: "emp-1",
      label: "Sarah",
      href: "/x",
      icon: "user-round",
      lane: "pinned",
      rank: 2,
      createdAt: new Date(),
    })
    expect(slot).toStrictEqual({
      id: "p1",
      label: "Sarah",
      href: "/x",
      resourceType: "hrm_employee",
      resourceId: "emp-1",
      icon: "user-round",
    })
  })

  it("omits icon when DTO icon is null (kernel rejects empty strings)", () => {
    const slot = pinDtoToSlot({
      id: "p1",
      workbenchId: "hrm",
      resourceType: "hrm_employee",
      resourceId: "emp-1",
      label: "Sarah",
      href: "/x",
      icon: null,
      lane: "pinned",
      rank: 0,
      createdAt: new Date(),
    })
    expect("icon" in slot).toBe(false)
  })
})

describe("viewDtoToSlot", () => {
  it("emits a kernel WorkbenchRailView shape", () => {
    const slot = viewDtoToSlot({
      id: "v1",
      workbenchId: "org-admin",
      label: "Active members",
      href: "/x?status=active",
      icon: "users",
      rank: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(slot).toStrictEqual({
      id: "v1",
      label: "Active members",
      href: "/x?status=active",
      icon: "users",
    })
  })
})

describe("recentDtoToSlot", () => {
  it("converts occurredAt to an ISO string and includes resourceId", () => {
    const slot = recentDtoToSlot({
      id: "r1",
      workbenchId: "hrm",
      resourceType: "hrm_employee",
      resourceId: "emp-1",
      label: "Sarah",
      href: "/x",
      icon: null,
      occurredAt: new Date("2026-05-12T10:00:00.000Z"),
    })
    expect(slot).toStrictEqual({
      id: "r1",
      label: "Sarah",
      href: "/x",
      resourceType: "hrm_employee",
      resourceId: "emp-1",
      occurredAt: "2026-05-12T10:00:00.000Z",
    })
  })

  it("omits resourceId for list-level recents (kernel rejects empty strings)", () => {
    const slot = recentDtoToSlot({
      id: "r1",
      workbenchId: "hrm",
      resourceType: "hrm_employee",
      resourceId: null,
      label: "Employees",
      href: "/x",
      icon: null,
      occurredAt: new Date("2026-05-12T10:00:00.000Z"),
    })
    expect("resourceId" in slot).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// dedupeRecents — pure logic
// ---------------------------------------------------------------------------

describe("dedupeRecents", () => {
  function makeRecent(input: {
    id: string
    resourceType: string
    resourceId: string | null
    href: string
    occurredAt: string
  }) {
    return {
      id: input.id,
      workbenchId: "hrm" as WorkbenchId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      label: input.id,
      href: input.href,
      icon: null,
      occurredAt: new Date(input.occurredAt),
    }
  }

  it("returns the first occurrence per (resourceType, resourceId)", () => {
    const out = dedupeRecents([
      makeRecent({
        id: "r3",
        resourceType: "hrm_employee",
        resourceId: "emp-1",
        href: "/a",
        occurredAt: "2026-05-12T15:00:00Z",
      }),
      makeRecent({
        id: "r2",
        resourceType: "hrm_employee",
        resourceId: "emp-2",
        href: "/b",
        occurredAt: "2026-05-12T14:00:00Z",
      }),
      makeRecent({
        id: "r1",
        resourceType: "hrm_employee",
        resourceId: "emp-1",
        href: "/a",
        occurredAt: "2026-05-12T12:00:00Z",
      }),
    ])
    expect(out.map((r) => r.id)).toStrictEqual(["r3", "r2"])
  })

  it("dedupes list-level recents by (resourceType, href) when resourceId is absent", () => {
    const out = dedupeRecents([
      makeRecent({
        id: "r2",
        resourceType: "hrm_employee",
        resourceId: null,
        href: "/o/acme/dashboard/hrm/employees",
        occurredAt: "2026-05-12T10:00:00Z",
      }),
      makeRecent({
        id: "r1",
        resourceType: "hrm_employee",
        resourceId: null,
        href: "/o/acme/dashboard/hrm/employees",
        occurredAt: "2026-05-12T09:00:00Z",
      }),
    ])
    expect(out.map((r) => r.id)).toStrictEqual(["r2"])
  })

  it("treats empty-string resourceId as list-level (defensive)", () => {
    const out = dedupeRecents([
      makeRecent({
        id: "r1",
        resourceType: "hrm_employee",
        resourceId: "",
        href: "/list",
        occurredAt: "2026-05-12T10:00:00Z",
      }),
      makeRecent({
        id: "r2",
        resourceType: "hrm_employee",
        resourceId: "",
        href: "/list",
        occurredAt: "2026-05-12T09:00:00Z",
      }),
    ])
    expect(out.map((r) => r.id)).toStrictEqual(["r1"])
  })

  it("preserves DESC order from the input", () => {
    const out = dedupeRecents([
      makeRecent({
        id: "r5",
        resourceType: "x",
        resourceId: "5",
        href: "/5",
        occurredAt: "2026-05-12T15:00:00Z",
      }),
      makeRecent({
        id: "r4",
        resourceType: "x",
        resourceId: "4",
        href: "/4",
        occurredAt: "2026-05-12T14:00:00Z",
      }),
      makeRecent({
        id: "r3",
        resourceType: "x",
        resourceId: "3",
        href: "/3",
        occurredAt: "2026-05-12T13:00:00Z",
      }),
    ])
    expect(out.map((r) => r.id)).toStrictEqual(["r5", "r4", "r3"])
  })

  it("returns empty array on empty input", () => {
    expect(dedupeRecents([])).toStrictEqual([])
  })
})

// ---------------------------------------------------------------------------
// WORKBENCH_REVALIDATE_PATTERNS — coverage + shape lock
// ---------------------------------------------------------------------------

describe("WORKBENCH_REVALIDATE_PATTERNS", () => {
  it("covers every WorkbenchId — adding a workbench requires a pattern", () => {
    // The `satisfies Record<WorkbenchId, AppPath>` clause already
    // enforces this at compile time; this test pins it at runtime so
    // a future tuple addition that forgets the pattern map fails here
    // before it can reach production (where `revalidatePath(undefined)`
    // would silently no-op the rail's freshness).
    for (const workbenchId of WORKBENCH_IDS) {
      expect(WORKBENCH_REVALIDATE_PATTERNS[workbenchId]).toBeTruthy()
      expect(WORKBENCH_REVALIDATE_PATTERNS[workbenchId]).toMatch(
        /^\/\[locale\]/
      )
    }
  })

  it("matches the locale-first revalidation grammar in lib/i18n", () => {
    // Lock the exact strings so a refactor of the helpers can't
    // silently change cache scope (e.g. accidentally narrowing
    // `org-admin` to a single locale).
    expect(WORKBENCH_REVALIDATE_PATTERNS).toStrictEqual({
      account: "/[locale]/account",
      "org-admin": "/[locale]/o/[orgSlug]/admin",
      hrm: "/[locale]/o/[orgSlug]/dashboard/hrm",
      "platform-admin": "/[locale]/operator",
    })
  })
})
