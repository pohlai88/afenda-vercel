// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import type { AnchorHTMLAttributes } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const fetchMock = vi.fn()

const TRANSLATIONS: Record<string, string> = {
  "Dashboard.shell.utilityBar.notifications.trigger": "Notifications",
  "Dashboard.shell.utilityBar.notifications.triggerUnread":
    "Notifications. {count} unread notices",
  "Dashboard.shell.utilityBar.notifications.tooltip": "Open org notice center",
  "Dashboard.shell.utilityBar.notifications.title": "Notifications",
  "Dashboard.shell.utilityBar.notifications.description":
    "Organization-wide notices from admins and governed system emitters.",
  "Dashboard.shell.utilityBar.notifications.unreadCount": "{count} unread",
  "Dashboard.shell.utilityBar.notifications.activeNotices": "Active notices",
  "Dashboard.shell.utilityBar.notifications.loading": "Loading notices…",
  "Dashboard.shell.utilityBar.notifications.emptyTitle": "No active notices",
  "Dashboard.shell.utilityBar.notifications.emptyDescription":
    "Broadcast notices from admins and system workflows will appear here.",
  "Dashboard.shell.utilityBar.notifications.detailEmptyTitle":
    "Select a notice",
  "Dashboard.shell.utilityBar.notifications.detailEmptyDescription":
    "Choose a notice from the list to review details and take action.",
  "Dashboard.shell.utilityBar.notifications.publishedAt": "Published",
  "Dashboard.shell.utilityBar.notifications.expiresAt": "Expires",
  "Dashboard.shell.utilityBar.notifications.linkedRecord": "Linked record",
  "Dashboard.shell.utilityBar.notifications.markRead": "Mark read",
  "Dashboard.shell.utilityBar.notifications.acknowledge": "Acknowledge",
  "Dashboard.shell.utilityBar.notifications.openLinkedRecord":
    "Open linked record",
  "Dashboard.shell.utilityBar.notifications.closeNotice": "Close notice",
  "Dashboard.shell.utilityBar.notifications.newNotice": "New notice",
  "Dashboard.shell.utilityBar.notifications.createTitle": "Publish notice",
  "Dashboard.shell.utilityBar.notifications.createDescription":
    "Broadcast a governed organization notice to all current operators.",
  "Dashboard.shell.utilityBar.notifications.publish": "Publish notice",
  "Dashboard.shell.utilityBar.notifications.cancel": "Cancel",
  "Dashboard.shell.utilityBar.notifications.fields.title": "Title",
  "Dashboard.shell.utilityBar.notifications.fields.body": "Body",
  "Dashboard.shell.utilityBar.notifications.fields.severity": "Severity",
  "Dashboard.shell.utilityBar.notifications.fields.expiresAt":
    "Expiry (optional)",
  "Dashboard.shell.utilityBar.notifications.fields.linkedLabel":
    "Linked record label (optional)",
  "Dashboard.shell.utilityBar.notifications.fields.linkedPath":
    "Linked record path (optional)",
  "Dashboard.shell.utilityBar.notifications.severity.info": "Info",
  "Dashboard.shell.utilityBar.notifications.severity.warning": "Warning",
  "Dashboard.shell.utilityBar.notifications.severity.critical": "Critical",
  "Dashboard.shell.utilityBar.notifications.source.admin": "Admin",
  "Dashboard.shell.utilityBar.notifications.source.system": "System",
  "Dashboard.shell.utilityBar.notifications.state.unread": "Unread",
  "Dashboard.shell.utilityBar.notifications.state.read": "Read",
  "Dashboard.shell.utilityBar.notifications.state.acknowledged": "Acknowledged",
  "Dashboard.shell.utilityBar.notifications.errors.generic":
    "Couldn't load notices. Try again.",
  "Dashboard.shell.utilityBar.notifications.errors.createFailed":
    "Couldn't publish the notice. Try again.",
}

function interpolate(
  template: string,
  values?: Record<string, string | number>
): string {
  if (!values) return template
  return Object.entries(values).reduce(
    (out, [key, value]) => out.replaceAll(`{${key}}`, String(value)),
    template
  )
}

vi.mock("next-intl", () => ({
  useTranslations:
    (namespace: string) =>
    (key: string, values?: Record<string, string | number>) =>
      interpolate(
        TRANSLATIONS[`${namespace}.${key}`] ?? `${namespace}.${key}`,
        values
      ),
}))

vi.mock("#i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}))

import { WorkbenchUtilityNotifications } from "#components/workbench/utility-bar/right-utility-bar/workbench-utility-notifications"
import { TooltipProvider } from "#components/ui/tooltip"

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  )
}

function makeNotice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "notice-1",
    title: "Vendor payment hold",
    body: "Compliance review is still pending.",
    source: "admin",
    severity: "critical",
    linkedEntityType: "Vendor",
    linkedEntityId: "vendor-1",
    linkedEntityLabel: "Vendor ACME",
    linkedPath: "/en/o/acme/dashboard/vendors/vendor-1",
    publishedAt: "2026-05-11T10:00:00.000Z",
    expiresAt: null,
    closedAt: null,
    closedByUserId: null,
    readAt: null,
    acknowledgedAt: null,
    isRead: false,
    isAcknowledged: false,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("NexusUtilityNotifications", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    vi.stubGlobal("fetch", fetchMock)
  })

  it("shows unread notices and lets the operator mark read and acknowledge", async () => {
    let items = [makeNotice()]

    fetchMock.mockImplementation(
      async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method ?? "GET"
        if (url.endsWith("/api/erp/notifications") && method === "GET") {
          return jsonResponse({ items })
        }
        if (url.endsWith("/read") && method === "POST") {
          items = [
            makeNotice({ isRead: true, readAt: "2026-05-11T10:10:00.000Z" }),
          ]
          return jsonResponse({ ok: true })
        }
        if (url.endsWith("/acknowledge") && method === "POST") {
          items = [
            makeNotice({
              isRead: true,
              readAt: "2026-05-11T10:10:00.000Z",
              isAcknowledged: true,
              acknowledgedAt: "2026-05-11T10:11:00.000Z",
            }),
          ]
          return jsonResponse({ ok: true })
        }
        throw new Error(`Unhandled ${method} ${url}`)
      }
    )

    render(
      <TooltipProvider>
        <WorkbenchUtilityNotifications canManage={false} />
      </TooltipProvider>
    )

    const trigger = await screen.findByRole(
      "button",
      { name: /Notifications\./ },
      { timeout: 15_000 }
    )

    fireEvent.click(trigger)

    expect((await screen.findAllByText("Vendor payment hold")).length).toBe(2)
    expect(screen.getAllByText("Unread").length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole("button", { name: "Mark read" }))

    await waitFor(() => {
      expect(screen.getByText("0 unread")).toBeTruthy()
      expect(screen.getAllByText("Read").length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByRole("button", { name: "Acknowledge" }))

    await waitFor(() => {
      expect(screen.getAllByText("Acknowledged").length).toBeGreaterThan(0)
      expect(
        screen
          .getByRole("link", { name: "Open linked record" })
          .getAttribute("href")
      ).toBe("/en/o/acme/dashboard/vendors/vendor-1")
    })
  })

  it("lets admins publish and close notices", async () => {
    let items: ReturnType<typeof makeNotice>[] = []
    let noticeCounter = 1

    fetchMock.mockImplementation(
      async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input)
        const method = init?.method ?? "GET"
        if (url.endsWith("/api/erp/notifications") && method === "GET") {
          return jsonResponse({ items })
        }
        if (url.endsWith("/api/erp/notifications") && method === "POST") {
          const payload = JSON.parse(String(init?.body))
          const created = makeNotice({
            id: `notice-${(noticeCounter += 1)}`,
            title: payload.title,
            body: payload.body,
            severity: payload.severity,
            linkedEntityLabel: payload.linkedEntityLabel,
            linkedPath: payload.linkedPath,
            isRead: false,
            isAcknowledged: false,
          })
          items = [created]
          return jsonResponse({ noticeId: created.id }, 201)
        }
        if (url.endsWith("/close") && method === "POST") {
          items = []
          return jsonResponse({ ok: true })
        }
        throw new Error(`Unhandled ${method} ${url}`)
      }
    )

    render(
      <TooltipProvider>
        <WorkbenchUtilityNotifications canManage />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }))
    fireEvent.click(await screen.findByRole("button", { name: "New notice" }))

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Policy notice" },
    })
    fireEvent.change(screen.getByLabelText("Body"), {
      target: { value: "Quarter-close rules changed." },
    })
    fireEvent.change(screen.getByLabelText("Linked record label (optional)"), {
      target: { value: "Policy register" },
    })
    fireEvent.change(screen.getByLabelText("Linked record path (optional)"), {
      target: { value: "/en/o/acme/dashboard/policies/quarter-close" },
    })

    fireEvent.click(screen.getByRole("button", { name: "Publish notice" }))

    expect((await screen.findAllByText("Policy notice")).length).toBe(2)

    fireEvent.click(screen.getByRole("button", { name: "Close notice" }))

    await waitFor(() => {
      expect(screen.getByText("No active notices")).toBeTruthy()
    })
  })
})
