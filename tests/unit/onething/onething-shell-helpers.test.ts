import { describe, expect, it } from "vitest"

import {
  pickNextRankedId,
  splitOneThingDraft,
  type RankedOneThing,
} from "#features/onething/client"

/**
 * These tests guard the two operational-momentum kernels of the morphed
 * OneThing surface:
 *
 *   - `pickNextRankedId` — drives `useResolveWithFocusHandoff`. If this
 *     drifts, the operator lands in the empty state when resolving the
 *     last item, which feels psychologically dead. OneThing shell doctrine (see onething-directory rule).
 *   - `splitOneThingDraft` — drives the composer's headline + body
 *     extraction. If this drifts, the body text leaks into the title
 *     (rejected by the schema) or gets dropped silently.
 */

function makeRanked(ids: string[]): readonly RankedOneThing[] {
  // The selector only reads `id`; cast through unknown so the test stays
  // shape-agnostic and does not have to reproduce every column on
  // `RankedOneThing` (it inherits a wide row + a `rankScore`).
  return ids.map((id) => ({ id, rankScore: 0 }) as unknown as RankedOneThing)
}

describe("pickNextRankedId — operational-momentum invariant", () => {
  it("returns null when the queue is empty", () => {
    expect(pickNextRankedId([], "anything")).toBeNull()
    expect(pickNextRankedId([], null)).toBeNull()
  })

  it("returns the queue head when nothing is focused", () => {
    expect(pickNextRankedId(makeRanked(["a", "b", "c"]), null)).toBe("a")
  })

  it("returns the queue head when the focused id is no longer ranked", () => {
    expect(pickNextRankedId(makeRanked(["a", "b", "c"]), "ghost-id")).toBe("a")
  })

  it("returns the next item when the operator is mid-queue", () => {
    expect(pickNextRankedId(makeRanked(["a", "b", "c"]), "a")).toBe("b")
    expect(pickNextRankedId(makeRanked(["a", "b", "c"]), "b")).toBe("c")
  })

  it("falls back to the previous item at the end of the queue", () => {
    expect(pickNextRankedId(makeRanked(["a", "b", "c"]), "c")).toBe("b")
  })

  it("returns null for the sole-item queue (composer takes over)", () => {
    expect(pickNextRankedId(makeRanked(["only"]), "only")).toBeNull()
  })
})

describe("splitOneThingDraft — Notes / Mail behavioral fidelity", () => {
  it("treats single-line input as headline-only", () => {
    expect(
      splitOneThingDraft("Vendor payment blocked for three organizations")
    ).toEqual({
      headline: "Vendor payment blocked for three organizations",
      body: "",
    })
  })

  it("trims whitespace from a single-line headline", () => {
    expect(
      splitOneThingDraft("  Q3 close has been waiting on the CFO  ")
    ).toEqual({
      headline: "Q3 close has been waiting on the CFO",
      body: "",
    })
  })

  it("extracts body from the lines after the first", () => {
    expect(
      splitOneThingDraft(
        "Vendor payment blocked for three organizations\nWe hold purchase auth.\nNext window closes Friday."
      )
    ).toEqual({
      headline: "Vendor payment blocked for three organizations",
      body: "We hold purchase auth.\nNext window closes Friday.",
    })
  })

  it("preserves internal blank lines as paragraph breaks", () => {
    const out = splitOneThingDraft(
      "Vendor payment blocked for three organizations\n\nFirst paragraph.\n\nSecond paragraph."
    )
    expect(out.headline).toBe("Vendor payment blocked for three organizations")
    expect(out.body).toContain("First paragraph.")
    expect(out.body).toContain("Second paragraph.")
    // Internal `\n\n` survives (the trim only touches leading / trailing).
    expect(out.body.split("\n\n").length).toBeGreaterThanOrEqual(2)
  })

  it("returns empty headline + body for whitespace-only input", () => {
    expect(splitOneThingDraft("")).toEqual({ headline: "", body: "" })
    expect(splitOneThingDraft("   ")).toEqual({ headline: "", body: "" })
    // The composer's onSubmit guard rejects this before it ever flies; the
    // splitter just stays honest about the absence of content.
  })

  it("does not leak body content into the headline", () => {
    const { headline, body } = splitOneThingDraft(
      "Headline only.\nBody starts here."
    )
    expect(headline).toBe("Headline only.")
    expect(headline).not.toContain("Body starts here")
    expect(body).toBe("Body starts here.")
  })
})
