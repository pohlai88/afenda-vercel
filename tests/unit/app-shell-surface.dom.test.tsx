// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("#i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { AppShellSurface } from "#app-shell/client"

afterEach(() => {
  cleanup()
})

describe("AppShellSurface", () => {
  it("renders breadcrumbs with the shadcn breadcrumb composition", () => {
    render(
      <AppShellSurface
        breadcrumbs={[
          { label: "Personal", href: "/account" },
          { label: "Personal surface" },
        ]}
      >
        <p>Surface content</p>
      </AppShellSurface>
    )

    const breadcrumb = screen.getByLabelText("breadcrumb")

    expect(breadcrumb.getAttribute("data-slot")).toBe("breadcrumb")
    expect(
      breadcrumb.querySelector('[data-slot="breadcrumb-list"]')
    ).not.toBeNull()
    expect(
      breadcrumb.querySelector('[data-slot="breadcrumb-link"]')
    ).not.toBeNull()
    expect(
      breadcrumb.querySelector('[data-slot="breadcrumb-page"]')?.textContent
    ).toBe("Personal surface")
    expect(
      breadcrumb.querySelector('[data-slot="breadcrumb-separator"]')
    ).not.toBeNull()
  })
})
