import { describe, expect, it } from "vitest"

import { buildOrbitKeyboardNavList } from "#features/planner"

describe("buildOrbitKeyboardNavList", () => {
  const empty = {
    items: [],
    signals: [],
    sessions: [],
    links: [],
  }

  it("orders triage rows as items then signals", () => {
    const rows = buildOrbitKeyboardNavList("triage", {
      items: [{ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" } as never],
      signals: [{ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" } as never],
      sessions: [],
      links: [],
    })
    expect(rows).toEqual([
      { kind: "item", id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
      { kind: "signal", id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" },
    ])
  })

  it("returns only items for queue-like surfaces", () => {
    expect(
      buildOrbitKeyboardNavList("queue", {
        ...empty,
        items: [{ id: "cccccccc-cccc-cccc-cccc-cccccccccccc" } as never],
      })
    ).toEqual([{ kind: "item", id: "cccccccc-cccc-cccc-cccc-cccccccccccc" }])
  })

  it("returns signals only on the signals surface", () => {
    expect(
      buildOrbitKeyboardNavList("signals", {
        ...empty,
        signals: [{ id: "dddddddd-dddd-dddd-dddd-dddddddddddd" } as never],
      })
    ).toEqual([{ kind: "signal", id: "dddddddd-dddd-dddd-dddd-dddddddddddd" }])
  })
})
