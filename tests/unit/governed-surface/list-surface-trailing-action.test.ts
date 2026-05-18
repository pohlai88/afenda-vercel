import { describe, expect, it } from "vitest"

import {
  isListSurfaceTrailingActionRenderable,
  listSurfaceRowTrailingActionHidden,
  parseListSurfaceRendererConfiguration,
  parseListSurfaceRowTrailingAction,
  resolveListSurfaceRowTrailingAction,
} from "#features/governed-surface"

describe("listSurfaceRowTrailingAction", () => {
  it("requires disabledReason when state is disabled", () => {
    const parsed = parseListSurfaceRowTrailingAction({
      state: "disabled",
    })
    expect(parsed.success).toBe(false)
  })

  it("resolves ready, disabled, and hidden states", () => {
    expect(
      resolveListSurfaceRowTrailingAction({
        allowed: true,
      })
    ).toEqual({ state: "ready" })

    expect(
      resolveListSurfaceRowTrailingAction({
        allowed: false,
        disabledReason: "Read-only",
        descriptor: {
          id: "erp.hrm.leave.approve",
          label: "Approve",
          intent: "approval",
        },
      })
    ).toEqual({
      state: "disabled",
      disabledReason: "Read-only",
      descriptor: {
        id: "erp.hrm.leave.approve",
        label: "Approve",
        intent: "approval",
      },
    })

    expect(listSurfaceRowTrailingActionHidden()).toEqual({ state: "hidden" })
    expect(isListSurfaceTrailingActionRenderable({ state: "hidden" })).toBe(
      false
    )
    expect(
      isListSurfaceTrailingActionRenderable({
        state: "disabled",
        disabledReason: "No access",
      })
    ).toBe(true)
  })

  it("parses trailingAction on list surface rows", () => {
    const parsed = parseListSurfaceRendererConfiguration({
      dataNature: "table",
      surface: {
        header: { title: "fixture" },
        columnsId: "fixture",
        rowKey: "id",
        empty: { variant: "muted", title: "Empty" },
      },
      columns: [{ id: "name", header: "Name" }],
      rows: [
        {
          id: "row-1",
          cells: { name: "Ada" },
          trailingAction: {
            state: "disabled",
            disabledReason: "Insufficient permission",
          },
        },
      ],
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.rows[0]?.trailingAction?.state).toBe("disabled")
  })
})
