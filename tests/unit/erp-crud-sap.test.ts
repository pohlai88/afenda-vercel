import { describe, expect, it } from "vitest"

import {
  CRUD_SAP_META_VERBS,
  CRUD_SAP_TEMPORAL_FOCUS,
  CRUD_SAP_VERBS,
  buildCrudSapAuditAction,
  buildErpAuditAction,
  crudSapVerbsForTemporalLayer,
  isCrudSapVerb,
  temporalLayerForCrudSapVerb,
} from "#lib/erp/crud-sap.shared"

describe("crud-sap.shared", () => {
  it("exhausts CRUD_SAP_VERBS", () => {
    expect(CRUD_SAP_VERBS).toEqual([
      "create",
      "resolve",
      "update",
      "deprecate",
      "search",
      "audit",
      "predict",
    ])
  })

  it("temporal mapping covers every verb except meta", () => {
    const mapped = new Set<string>([
      ...CRUD_SAP_TEMPORAL_FOCUS.past,
      ...CRUD_SAP_TEMPORAL_FOCUS.now,
      ...CRUD_SAP_TEMPORAL_FOCUS.next,
      ...CRUD_SAP_META_VERBS,
    ])
    for (const v of CRUD_SAP_VERBS) {
      expect(mapped.has(v)).toBe(true)
    }
  })

  it("temporalLayerForCrudSapVerb classifies verbs", () => {
    expect(temporalLayerForCrudSapVerb("search")).toBe("past")
    expect(temporalLayerForCrudSapVerb("audit")).toBe("past")
    expect(temporalLayerForCrudSapVerb("resolve")).toBe("now")
    expect(temporalLayerForCrudSapVerb("update")).toBe("now")
    expect(temporalLayerForCrudSapVerb("predict")).toBe("next")
    expect(temporalLayerForCrudSapVerb("create")).toBe("next")
    expect(temporalLayerForCrudSapVerb("deprecate")).toBe("meta")
  })

  it("crudSapVerbsForTemporalLayer returns stable arrays", () => {
    expect(crudSapVerbsForTemporalLayer("past")).toEqual(["search", "audit"])
    expect(crudSapVerbsForTemporalLayer("now")).toEqual(["resolve", "update"])
    expect(crudSapVerbsForTemporalLayer("next")).toEqual(["predict", "create"])
  })

  it("isCrudSapVerb narrows type", () => {
    expect(isCrudSapVerb("resolve")).toBe(true)
    expect(isCrudSapVerb("post")).toBe(false)
  })

  it("buildCrudSapAuditAction emits dotted action", () => {
    expect(
      buildCrudSapAuditAction({
        area: "erp",
        module: "OneThing",
        object: "OneThing",
        verb: "resolve",
      })
    ).toBe("erp.onething.onething.resolve")
  })

  it("buildCrudSapAuditAction rejects empty segments", () => {
    expect(() =>
      buildCrudSapAuditAction({
        area: "erp",
        module: "   ",
        object: "x",
        verb: "create",
      })
    ).toThrow()
  })

  it("buildErpAuditAction accepts legacy verbs", () => {
    expect(
      buildErpAuditAction({
        area: "erp",
        module: "sale",
        object: "order",
        verb: "post",
      })
    ).toBe("erp.sale.order.post")
  })
})
