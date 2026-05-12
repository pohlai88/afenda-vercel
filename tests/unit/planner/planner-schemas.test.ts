import { describe, expect, it } from "vitest"

import {
  addPlannerAttachmentMetadataFormSchema,
  correlatePlannerSignalFormSchema,
  createPlannerItemFormSchema,
  createPlannerRelationFormSchema,
  createPlannerSignalFormSchema,
  savePlannerViewFormSchema,
  transitionPlannerItemFormSchema,
} from "#features/planner/domain/planner.schemas"

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
    expect(
      transitionPlannerItemFormSchema.safeParse({
        itemId: "4c98f55a-fdbc-4bb6-8717-c0cb6760dc73",
        lifecycle: "resolved",
        correlatedSignalPolicy: "auto_resolve",
      }).success
    ).toBe(true)
  })
})
