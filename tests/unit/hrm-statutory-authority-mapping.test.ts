/**
 * Phase 3I — External authority mapping golden tests.
 *
 * Locks the canonical bureau / authority name for each Malaysian statutory
 * pack. These strings surface in:
 *   - IAM audit event metadata (`metadata.authorityName`)
 *   - Compliance UI provenance ("Acknowledged · KWSP · manual")
 *   - Future regulator dashboards
 *
 * Changing them requires explicit governance review (and matching update to
 * AGENTS.md / hrm-draft-v2). The mapping is *derived* from packType, not
 * stored — see `STATUTORY_PACK_TO_AUTHORITY` doc comment for rationale.
 */
import { describe, expect, it } from "vitest"

import {
  ACKNOWLEDGEMENT_SOURCES,
  STATUTORY_PACK_TO_AUTHORITY,
  STATUTORY_PACK_TO_EVENT_TYPE,
  authorityForStatutoryPack,
  isAcknowledgementSource,
} from "../../lib/features/hrm/data/statutory-event-types.shared"

describe("Statutory pack -> external authority mapping", () => {
  it("covers the same set of pack types as the submission mapping", () => {
    expect(Object.keys(STATUTORY_PACK_TO_AUTHORITY).sort()).toEqual(
      Object.keys(STATUTORY_PACK_TO_EVENT_TYPE).sort()
    )
  })

  it("returns the canonical Malaysian authority for each pack", () => {
    expect(STATUTORY_PACK_TO_AUTHORITY).toEqual({
      epf_monthly: "KWSP",
      socso_monthly: "PERKESO",
      eis_monthly: "PERKESO",
      pcb_monthly: "LHDN",
      ea_annual: "LHDN",
      borang_e_annual: "LHDN",
    })
  })

  it("collapses SOCSO and EIS to the single PERKESO authority", () => {
    // SOCSO and EIS are administered by the same statutory body (PERKESO)
    // even though the bureau accepts them via separate filings. Storing them
    // as the same authority lets future bureau-side webhooks join on a
    // single endpoint per authority.
    expect(STATUTORY_PACK_TO_AUTHORITY.socso_monthly).toEqual(
      STATUTORY_PACK_TO_AUTHORITY.eis_monthly
    )
  })

  it("collapses PCB, EA, and Borang E to the single LHDN authority", () => {
    // All three tax artifacts are filed with LHDN (Lembaga Hasil Dalam
    // Negeri / IRBM). Splitting them would falsely imply distinct external
    // signing authorities.
    const tax = new Set([
      STATUTORY_PACK_TO_AUTHORITY.pcb_monthly,
      STATUTORY_PACK_TO_AUTHORITY.ea_annual,
      STATUTORY_PACK_TO_AUTHORITY.borang_e_annual,
    ])
    expect(tax).toEqual(new Set(["LHDN"]))
  })

  it("uses uppercase short names matching the regulator self-identification", () => {
    // Each authority publishes itself in uppercase initials in official
    // forms (KWSP / PERKESO / LHDN). Lower-case or mixed-case variants
    // would fail bureau-side string matching in any future webhook
    // verification step.
    for (const authority of Object.values(STATUTORY_PACK_TO_AUTHORITY)) {
      expect(authority).toEqual(authority.toUpperCase())
    }
  })
})

describe("authorityForStatutoryPack runtime resolver", () => {
  it("resolves every registered pack type", () => {
    for (const [packType, expected] of Object.entries(
      STATUTORY_PACK_TO_AUTHORITY
    )) {
      expect(authorityForStatutoryPack(packType)).toBe(expected)
    }
  })

  it("returns null for unregistered pack strings", () => {
    expect(authorityForStatutoryPack("unknown_monthly")).toBeNull()
    expect(authorityForStatutoryPack("")).toBeNull()
    expect(authorityForStatutoryPack("epf_quarterly")).toBeNull()
  })
})

describe("ACKNOWLEDGEMENT_SOURCES enum", () => {
  it("declares the four canonical sources", () => {
    expect([...ACKNOWLEDGEMENT_SOURCES]).toEqual([
      "manual",
      "webhook",
      "api",
      "import",
    ])
  })

  it("isAcknowledgementSource accepts every declared source", () => {
    for (const source of ACKNOWLEDGEMENT_SOURCES) {
      expect(isAcknowledgementSource(source)).toBe(true)
    }
  })

  it("isAcknowledgementSource rejects unknown / null / undefined", () => {
    expect(isAcknowledgementSource("MANUAL")).toBe(false) // case-sensitive
    expect(isAcknowledgementSource("system")).toBe(false)
    expect(isAcknowledgementSource("")).toBe(false)
    expect(isAcknowledgementSource(null)).toBe(false)
    expect(isAcknowledgementSource(undefined)).toBe(false)
  })

  it("manual is the only source the manual-ack server action emits today", () => {
    // Phase 3J (webhook receiver) will introduce 'webhook'. Phase 3K (bureau
    // API client) will introduce 'api'. CSV bulk import (no current owner)
    // would introduce 'import'. Asserting the enum is fixed keeps future
    // additions explicit (require updating this test).
    expect(ACKNOWLEDGEMENT_SOURCES.length).toBe(4)
  })
})
