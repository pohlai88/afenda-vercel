// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

const push = vi.fn()

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver
Element.prototype.scrollIntoView = vi.fn()

vi.mock("#i18n/navigation", () => ({
  useRouter: () => ({ push }),
}))

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    switch (key) {
      case "placeholder":
        return "Search…"
      case "empty":
        return "No results found."
      default:
        return key
    }
  },
}))

import { AppShellCommandPalette } from "#app-shell/client"
import { useAppShellStore } from "#components2/stores/app-shell.store"

function OpenCommandOnMount() {
  const openCommand = useAppShellStore((s) => s.openCommand)

  useEffect(() => {
    openCommand()
  }, [openCommand])

  return null
}

describe("AppShellCommandPalette", () => {
  afterEach(() => {
    cleanup()
    push.mockReset()
    useAppShellStore.setState({ commandOpen: false })
  })

  it("filters commands and navigates with the selected result", async () => {
    render(
      <>
        <OpenCommandOnMount />
        <AppShellCommandPalette
          placeholder="Search…"
          dialogTitle="Admin command palette"
          dialogDescription="Search admin navigation"
          sections={[
            {
              heading: "Admin",
              items: [
                {
                  id: "admin-overview",
                  label: "Overview",
                  href: "/en/o/acme/admin/overview",
                },
                {
                  id: "admin-audit",
                  label: "Audit log",
                  href: "/en/o/acme/admin/audit",
                  description: "Review evidence and access history",
                  keywords: ["audit", "history", "evidence"],
                },
              ],
            },
          ]}
        />
      </>
    )

    const input = await screen.findByPlaceholderText("Search…")
    fireEvent.change(input, { target: { value: "audit" } })

    await waitFor(() => {
      expect(screen.queryByText("Overview")).toBeNull()
    })

    const auditCommand = screen.getByText("Audit log")
    fireEvent.click(auditCommand)

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/en/o/acme/admin/audit")
    })
  })
})
