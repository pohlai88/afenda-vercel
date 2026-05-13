/**
 * Phase 3H — Manual bureau acknowledgement audit mapping.
 *
 * Locks the canonical `erp.hrm.statutory.<bureau>.acknowledged` strings.
 * These end up in `iam_audit_event` rows that regulators may inspect, so
 * any change requires explicit governance review (and matching update to
 * AGENTS.md §IAM audit policy).
 */
import { describe, expect, it } from "vitest"

import {
  STATUTORY_PACK_TO_ACK_EVENT_TYPE,
  STATUTORY_PACK_TO_EVENT_TYPE,
  ackEventTypeForStatutoryPack,
  eventTypeForStatutoryPack,
} from "../../lib/features/hrm/data/statutory-event-types.shared"

describe("Statutory acknowledgement audit mapping", () => {
  it("covers the same set of pack types as the submission mapping", () => {
    expect(Object.keys(STATUTORY_PACK_TO_ACK_EVENT_TYPE).sort()).toEqual(
      Object.keys(STATUTORY_PACK_TO_EVENT_TYPE).sort()
    )
  })

  it("emits canonical bureau-scoped acknowledgement actions", () => {
    expect(STATUTORY_PACK_TO_ACK_EVENT_TYPE).toEqual({
      epf_monthly: "erp.hrm.statutory.epf.acknowledged",
      socso_monthly: "erp.hrm.statutory.socso.acknowledged",
      eis_monthly: "erp.hrm.statutory.eis.acknowledged",
      hrdf_monthly: "erp.hrm.statutory.hrdf.acknowledged",
      pcb_monthly: "erp.hrm.statutory.pcb.acknowledged",
      // EA + Borang E both surface under the EA bureau audit family,
      // matching the existing `published` mapping for these annual packs.
      ea_annual: "erp.hrm.statutory.ea.acknowledged",
      borang_e_annual: "erp.hrm.statutory.ea.acknowledged",
    })
  })

  it("ack action names always end in `.acknowledged`", () => {
    for (const action of Object.values(STATUTORY_PACK_TO_ACK_EVENT_TYPE)) {
      expect(action).toMatch(/^erp\.hrm\.statutory\.[a-z_]+\.acknowledged$/)
    }
  })

  it("ack and submit families share the same bureau segment", () => {
    // For every pack that has a submit action ending in `.submitted`, the
    // matching ack action MUST share the bureau segment so audit tooling can
    // group them. (EA uses `.published` instead of `.submitted`, so we
    // compare on the second-to-last segment, not the verb.)
    for (const packType of Object.keys(STATUTORY_PACK_TO_ACK_EVENT_TYPE)) {
      const submitAction =
        STATUTORY_PACK_TO_EVENT_TYPE[
          packType as keyof typeof STATUTORY_PACK_TO_EVENT_TYPE
        ]
      const ackAction =
        STATUTORY_PACK_TO_ACK_EVENT_TYPE[
          packType as keyof typeof STATUTORY_PACK_TO_ACK_EVENT_TYPE
        ]
      const submitBureau = submitAction.split(".").at(-2)
      const ackBureau = ackAction.split(".").at(-2)
      expect(ackBureau).toBe(submitBureau)
    }
  })
})

describe("ackEventTypeForStatutoryPack — runtime resolver", () => {
  it("returns the canonical action for known pack types", () => {
    expect(ackEventTypeForStatutoryPack("epf_monthly")).toBe(
      "erp.hrm.statutory.epf.acknowledged"
    )
    expect(ackEventTypeForStatutoryPack("socso_monthly")).toBe(
      "erp.hrm.statutory.socso.acknowledged"
    )
    expect(ackEventTypeForStatutoryPack("ea_annual")).toBe(
      "erp.hrm.statutory.ea.acknowledged"
    )
    expect(ackEventTypeForStatutoryPack("borang_e_annual")).toBe(
      "erp.hrm.statutory.ea.acknowledged"
    )
  })

  it("returns null for unknown pack types (no fallback string)", () => {
    expect(ackEventTypeForStatutoryPack("not_a_real_pack")).toBeNull()
    expect(ackEventTypeForStatutoryPack("")).toBeNull()
  })

  it("does not interfere with the submission resolver", () => {
    // Defensive: the two resolvers must not return the same string for a
    // known pack — that would collapse the audit timeline.
    for (const packType of Object.keys(STATUTORY_PACK_TO_ACK_EVENT_TYPE)) {
      const ack = ackEventTypeForStatutoryPack(packType)
      const submit = eventTypeForStatutoryPack(packType)
      expect(ack).not.toBe(submit)
    }
  })
})
