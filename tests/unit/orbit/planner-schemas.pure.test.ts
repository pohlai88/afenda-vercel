import { describe, expect, it } from "vitest"

import {
  addPlannerAttachmentMetadataFormSchema,
  batchPlannerQueueItemsActionFormSchema,
  batchPlannerTriageActionFormSchema,
  capturePlannerItemFormSchema,
  correlatePlannerSignalFormSchema,
  createPlannerLinkFormSchema,
  createPlannerItemFormSchema,
  createPlannerRelationFormSchema,
  createPlannerSignalFormSchema,
  savePlannerViewFormSchema,
  transitionPlannerItemFormSchema,
  upsertPlannerRecurrenceFormSchema,
} from "#features/orbit/domain/planner.schemas"

describe("planner form schemas", () => {
  it("accepts minimal signal capture", () => {
    const parsed = createPlannerSignalFormSchema.safeParse({
      title: " Vendor certificate expiry ",
      description: "",
      signalClass: "deadline",
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.title).toBe("Vendor certificate expiry")
      expect(parsed.data.signalClass).toBe("deadline")
    }
  })

  it("rejects empty signal titles", () => {
    expect(
      createPlannerSignalFormSchema.safeParse({
        title: "   ",
      }).success
    ).toBe(false)
  })

  it("accepts minimal planner items and normalizes blank dates", () => {
    const parsed = createPlannerItemFormSchema.safeParse({
      title: "Reconcile supplier variance",
      description: "  ",
      dueAt: "",
      pressure: {
        urgency: 4,
        severity: 5,
      },
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.title).toBe("Reconcile supplier variance")
      expect(parsed.data.dueAt).toBeNull()
      expect(parsed.data.pressure.urgency).toBe(4)
    }
  })

  it("accepts plain-language Orbit capture payloads", () => {
    const parsed = capturePlannerItemFormSchema.safeParse({
      rawText: "review payroll variance tomorrow 9am",
      scopeKind: "organization",
      surface: "queue",
      orgSlug: "acme",
      timeZone: "UTC",
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.rawText).toBe("review payroll variance tomorrow 9am")
      expect(parsed.data.timeZone).toBe("UTC")
    }
  })

  it("rejects invalid recurrence rules", () => {
    expect(
      upsertPlannerRecurrenceFormSchema.safeParse({
        itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
        rrule: "FREQ=WEEKLY;BYDAY=FR",
      }).success
    ).toBe(true)

    expect(
      upsertPlannerRecurrenceFormSchema.safeParse({
        itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
        rrule: "FREQ=BOGUS",
      }).success
    ).toBe(false)
  })

  it("rejects invalid planner item dates", () => {
    expect(
      createPlannerItemFormSchema.safeParse({
        title: "Bad date",
        dueAt: "not-a-date",
      }).success
    ).toBe(false)
  })

  it("accepts planner attachment metadata", () => {
    const parsed = addPlannerAttachmentMetadataFormSchema.safeParse({
      itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
      blobUrl: "https://example.com/orbit/evidence.pdf",
      payloadHash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      mimeType: "application/pdf",
      sizeBytes: "2048",
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.sizeBytes).toBe(2048)
    }
  })

  it("accepts saved queue views with serialized filter state", () => {
    const parsed = savePlannerViewFormSchema.safeParse({
      name: "Critical HRM queue",
      slug: "critical-hrm-queue",
      surface: "queue",
      filterState: JSON.stringify({
        displayPriority: ["critical"],
        linkedModule: ["hrm"],
      }),
      sortMode: "priority_desc",
    })

    expect(parsed.success).toBe(true)
  })

  it("accepts saved views across Orbit operator surfaces", () => {
    for (const surface of [
      "triage",
      "today",
      "timeline",
      "signals",
      "sessions",
      "links",
    ]) {
      expect(
        savePlannerViewFormSchema.safeParse({
          name: `${surface} lens`,
          surface,
          filterState: JSON.stringify({}),
          sortMode: "updated_desc",
        }).success
      ).toBe(true)
    }
  })

  it("accepts either related item or related signal for relation authoring", () => {
    expect(
      createPlannerRelationFormSchema.safeParse({
        itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
        relationType: "blocks",
        relatedItemId: "b5db4acc-66ad-4650-b92e-468f1787dd4e",
      }).success
    ).toBe(true)

    expect(
      createPlannerRelationFormSchema.safeParse({
        itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
        relationType: "related",
        relatedSignalId: "d0d38696-5ad2-4a1f-9a5f-2e1b657c2bdb",
      }).success
    ).toBe(true)
  })

  it("requires a non-empty causality reason for planner links", () => {
    expect(
      createPlannerLinkFormSchema.safeParse({
        itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
        module: "hrm",
        entityType: "employee",
        entityId: "emp-1",
        displayLabel: "Employee profile",
        href: "https://example.com/hrm/employees/emp-1",
        causalityReason: "   ",
      }).success
    ).toBe(false)

    expect(
      createPlannerLinkFormSchema.safeParse({
        itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
        module: "hrm",
        entityType: "employee",
        entityId: "emp-1",
        displayLabel: "Employee profile",
        href: "https://example.com/hrm/employees/emp-1",
        causalityReason: "Payroll discrepancy detected during finalize.",
      }).success
    ).toBe(true)
  })

  it("rejects ambiguous relation authoring payloads", () => {
    expect(
      createPlannerRelationFormSchema.safeParse({
        itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
        relationType: "related",
        relatedItemId: "b5db4acc-66ad-4650-b92e-468f1787dd4e",
        relatedSignalId: "d0d38696-5ad2-4a1f-9a5f-2e1b657c2bdb",
      }).success
    ).toBe(false)
  })

  it("accepts correlation of a signal to an existing item", () => {
    expect(
      correlatePlannerSignalFormSchema.safeParse({
        signalId: "d0d38696-5ad2-4a1f-9a5f-2e1b657c2bdb",
        itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
      }).success
    ).toBe(true)
  })

  it("accepts resolution policy on item transition payloads", () => {
    const parsed = transitionPlannerItemFormSchema.safeParse({
      itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
      lifecycle: "resolved",
      correlatedSignalPolicy: "auto_resolve",
      closeActiveNotices: "on",
      resolutionNote: "Operator verified closure evidence.",
    })

    expect(parsed.success).toBe(true)
    expect(parsed.data).toEqual(
      expect.objectContaining({
        closeActiveNotices: true,
        resolutionNote: "Operator verified closure evidence.",
      })
    )
  })

  it("accepts batch signal promotion payloads", () => {
    const parsed = batchPlannerTriageActionFormSchema.safeParse({
      operation: "promote_signals",
      signalIds: [
        "d0d38696-5ad2-4a1f-9a5f-2e1b657c2bdb",
        "a0d38696-5ad2-4a1f-9a5f-2e1b657c2bdc",
      ],
      itemIds: [],
    })

    expect(parsed.success).toBe(true)
  })

  it("requires an assignee reference for batch item assignment", () => {
    expect(
      batchPlannerTriageActionFormSchema.safeParse({
        operation: "assign_items",
        itemIds: ["4c98f55a-fdbc-4bb6-8717-c0cb6760dc73"],
        signalIds: [],
      }).success
    ).toBe(false)

    expect(
      batchPlannerTriageActionFormSchema.safeParse({
        operation: "assign_items",
        itemIds: ["4c98f55a-fdbc-4bb6-8717-c0cb6760dc73"],
        signalIds: [],
        subjectLabel: "Payroll reviewer",
      }).success
    ).toBe(true)
  })

  it("accepts queue batch payloads for queue surfaces", () => {
    const parsed = batchPlannerQueueItemsActionFormSchema.safeParse({
      surface: "queue",
      operation: "assign_items",
      itemIds: ["4c98f55a-fdbc-4bb6-8717-c0cb6760dc73"],
      subjectLabel: "Ops lead",
    })
    expect(parsed.success).toBe(true)
  })

  it("rejects queue batch on triage surface", () => {
    expect(
      batchPlannerQueueItemsActionFormSchema.safeParse({
        surface: "triage",
        operation: "assign_items",
        itemIds: ["4c98f55a-fdbc-4bb6-8717-c0cb6760dc73"],
        subjectLabel: "Ops lead",
      }).success
    ).toBe(false)
  })
})
