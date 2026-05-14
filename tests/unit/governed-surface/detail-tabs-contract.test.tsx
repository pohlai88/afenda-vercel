// @vitest-environment jsdom

import { render } from "@testing-library/react"
import type { AnchorHTMLAttributes } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  DETAIL_TABS_SCHEMA_STABILITY,
  GovernedDetailTabs,
  parseGovernedDetailTabsData,
} from "#features/governed-surface"

vi.mock("#i18n/navigation", () => ({
  Link: ({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string
    prefetch?: boolean
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const minimalOverview = {
  id: "overview-1",
  label: "Summary",
  rendererKey: "unregistered-stub",
}

describe("governed detail tabs schema", () => {
  it("parses a minimum model (overview only)", () => {
    const raw = {
      entityLabel: "Employee 001",
      entityKind: "hrm.employee",
      entityId: "11111111-1111-1111-1111-111111111111",
      overview: minimalOverview,
    }
    const parsed = parseGovernedDetailTabsData(raw)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.defaultTab).toBe("overview")
    expect(parsed.data.overview.rendererKey).toBe("unregistered-stub")
  })

  it("parses sparse slots (audit without revisions)", () => {
    const raw = {
      entityLabel: "Employee 002",
      entityKind: "hrm.employee",
      entityId: "22222222-2222-2222-2222-222222222222",
      overview: minimalOverview,
      audit: [
        {
          id: "audit-row-1",
          action: "erp.hrm.employee.update",
          occurredAt: "2024-01-15T12:00:00.000Z",
          actorLabel: "Actor",
          resourceLabel: "Employee 002",
          narrative: "Updated record.",
        },
      ],
    }
    const parsed = parseGovernedDetailTabsData(raw)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.audit).toHaveLength(1)
    expect(parsed.data.revisions).toBeUndefined()
  })

  it("exports experimental schema stability from the barrel", () => {
    expect(DETAIL_TABS_SCHEMA_STABILITY).toBe("experimental")
  })
})

describe("GovernedDetailTabs", () => {
  it("exposes data-test on the overview tab trigger", () => {
    const { container } = render(
      <GovernedDetailTabs
        model={{
          entityLabel: "Test entity",
          entityKind: "test.entity",
          entityId: "33333333-3333-3333-3333-333333333333",
          overview: {
            id: "ov",
            label: "Overview label",
            rendererKey: "noop",
          },
        }}
      />
    )

    expect(
      container.querySelector('[data-test="governed-detail-tabs"]')
    ).toBeTruthy()
    expect(container.querySelector('[data-test="tab-overview"]')).toBeTruthy()
    expect(
      container.querySelector('[data-test="tab-panel-overview"]')
    ).toBeTruthy()
  })
})
