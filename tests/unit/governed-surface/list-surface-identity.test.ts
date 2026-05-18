import { describe, expect, it } from "vitest"

import {
  buildGovernedListSurfaceDataAttributes,
  buildGovernedListSurfaceRenderFingerprint,
  governedListRowTestId,
  governedListSectionTestId,
  governedListSurfaceTestId,
  summarizeListSurfaceTrailingActions,
} from "#features/governed-surface/list-surface-identity.shared"

describe("governed list surface identity", () => {
  it("builds stable section and list test ids from surfaceKey", () => {
    expect(governedListSectionTestId("hrm:performance:reviews")).toBe(
      "governed-list-section:hrm:performance:reviews"
    )
    expect(governedListSurfaceTestId("hrm:performance:reviews")).toBe(
      "governed-list-surface:hrm:performance:reviews"
    )
    expect(governedListRowTestId("hrm:performance:reviews", "rev-1")).toBe(
      "governed-list-row:hrm:performance:reviews:rev-1"
    )
  })

  it("summarizes trailing action states for diagnostics", () => {
    expect(
      summarizeListSurfaceTrailingActions([
        { trailingAction: { state: "hidden" } },
        {
          trailingAction: {
            state: "disabled",
            disabledReason: "Read-only",
          },
        },
        { trailingAction: { state: "ready" } },
        {},
      ])
    ).toEqual({
      total: 4,
      hidden: 1,
      disabled: 1,
      ready: 1,
    })
  })

  it("builds stable render log fingerprints for dedupe", () => {
    const input = {
      surfaceKey: "hrm:onboarding:contracts",
      columnsId: "hrm-onboarding-contracts",
      dataNature: "table" as const,
      presentationVariant: "table-only",
      density: "compact",
      state: "ready" as const,
      rowCount: 2,
      trailing: { total: 2, hidden: 0, disabled: 1, ready: 1 },
    }
    expect(buildGovernedListSurfaceRenderFingerprint(input)).toBe(
      "hrm:onboarding:contracts|ready|2|hrm-onboarding-contracts|compact|table-only|0|1|1"
    )
  })

  it("emits governed data attributes for list render tracing", () => {
    expect(
      buildGovernedListSurfaceDataAttributes({
        surfaceKey: "hrm:onboarding:contracts",
        columnsId: "hrm-onboarding-contracts",
        dataNature: "table",
        presentationVariant: "table-only",
        density: "compact",
        state: "empty",
      })
    ).toEqual({
      "data-governed-surface-key": "hrm:onboarding:contracts",
      "data-governed-list-state": "empty",
      "data-governed-columns-id": "hrm-onboarding-contracts",
      "data-governed-table-density": "compact",
      "data-governed-data-nature": "table",
      "data-governed-presentation-variant": "table-only",
    })
  })
})
