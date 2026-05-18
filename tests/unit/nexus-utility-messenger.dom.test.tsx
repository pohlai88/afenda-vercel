// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import type { ComponentType } from "react"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

const { html2canvasMock, uploadMock } = vi.hoisted(() => ({
  html2canvasMock: vi.fn(),
  uploadMock: vi.fn(),
}))

const TRANSLATIONS: Record<string, string> = {
  "Dashboard.shell.utilityBar.coordination.trigger": "Coordination",
  "Dashboard.shell.utilityBar.coordination.tooltip":
    "Open operational coordination",
  "Dashboard.shell.utilityBar.coordination.title": "Operational coordination",
  "Dashboard.shell.utilityBar.coordination.description":
    "Coordinate around operational work, evidence, and review trails without leaving the workspace.",
  "Dashboard.shell.utilityBar.coordination.newContext": "New context",
  "Dashboard.shell.utilityBar.coordination.contextsTitle": "Contexts",
  "Dashboard.shell.utilityBar.coordination.contextNoActivity":
    "No activity yet.",
  "Dashboard.shell.utilityBar.coordination.emptyContexts":
    "No coordination contexts yet. Start one when work needs shared review, evidence, or follow-up.",
  "Dashboard.shell.utilityBar.coordination.linkedRecord": "Linked record",
  "Dashboard.shell.utilityBar.coordination.unlinkedContext":
    "This context is not linked to an operational record yet.",
  "Dashboard.shell.utilityBar.coordination.openLinkedRecord":
    "Open linked record",
  "Dashboard.shell.utilityBar.coordination.attachEvidence": "Attach evidence",
  "Dashboard.shell.utilityBar.coordination.markReviewed": "Mark reviewed",
  "Dashboard.shell.utilityBar.coordination.activityTitle": "Activity",
  "Dashboard.shell.utilityBar.coordination.loading": "Loading coordination…",
  "Dashboard.shell.utilityBar.coordination.emptyActivity":
    "No activity yet. Add a coordination update or evidence to start the trail.",
  "Dashboard.shell.utilityBar.coordination.composerLabel":
    "Add coordination update",
  "Dashboard.shell.utilityBar.coordination.composerPlaceholder":
    "Summarize the situation, the decision needed, or the evidence that matters.",
  "Dashboard.shell.utilityBar.coordination.attachFile": "Attach file",
  "Dashboard.shell.utilityBar.coordination.attachScreenshot":
    "Attach screenshot",
  "Dashboard.shell.utilityBar.coordination.sendUpdate": "Send update",
  "Dashboard.shell.utilityBar.coordination.sending": "Sending…",
  "Dashboard.shell.utilityBar.coordination.evidenceTitle": "Evidence",
  "Dashboard.shell.utilityBar.coordination.openEvidence": "Open evidence",
  "Dashboard.shell.utilityBar.coordination.emptyEvidence":
    "No evidence attached yet.",
  "Dashboard.shell.utilityBar.coordination.selectContext":
    "Select an operational context to review coordination and evidence.",
  "Dashboard.shell.utilityBar.coordination.newContextTitle":
    "New operational context",
  "Dashboard.shell.utilityBar.coordination.newContextDescription":
    "Create a coordination context for the operators who need to review or act together.",
  "Dashboard.shell.utilityBar.coordination.subjectLabel": "Context title",
  "Dashboard.shell.utilityBar.coordination.subjectPlaceholder":
    "Example: Vendor payment hold",
  "Dashboard.shell.utilityBar.coordination.startNoteLabel": "Starting note",
  "Dashboard.shell.utilityBar.coordination.startNotePlaceholder":
    "Optional: summarize the issue, decision, or handoff needed.",
  "Dashboard.shell.utilityBar.coordination.operatorsLabel": "Operators",
  "Dashboard.shell.utilityBar.coordination.noOperators":
    "No operators available in this organization.",
  "Dashboard.shell.utilityBar.coordination.cancel": "Cancel",
  "Dashboard.shell.utilityBar.coordination.creating": "Creating…",
  "Dashboard.shell.utilityBar.coordination.createContext": "Create context",
  "Dashboard.shell.utilityBar.coordination.reviewedNote": "Marked reviewed.",
  "Dashboard.shell.utilityBar.coordination.activityKinds.comment":
    "Coordination",
  "Dashboard.shell.utilityBar.coordination.activityKinds.evidence_added":
    "Evidence added",
  "Dashboard.shell.utilityBar.coordination.activityKinds.status_note":
    "Status note",
  "Dashboard.shell.utilityBar.coordination.evidenceKinds.file": "File evidence",
  "Dashboard.shell.utilityBar.coordination.evidenceKinds.screenshot":
    "Screenshot evidence",
  "Dashboard.shell.utilityBar.coordination.errors.generic":
    "Something went wrong. Try again.",
  "Dashboard.shell.utilityBar.coordination.errors.captureTarget":
    "The workspace capture area is not available on this screen.",
  "Dashboard.shell.utilityBar.coordination.errors.captureFailed":
    "Screenshot evidence capture failed. Try again.",
  "Dashboard.shell.utilityBar.coordination.errors.sendFailed":
    "Couldn't send the coordination update. Try again.",
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

vi.mock("html2canvas", () => ({
  default: html2canvasMock,
}))

vi.mock("@vercel/blob/client", () => ({
  upload: uploadMock,
}))

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
  usePathname: () => "/en/o/acme/apps/home",
}))

import { TooltipProvider } from "#components2/ui/tooltip"

type ContextRow = {
  id: string
  subject: string
  linkedEntityType: string | null
  linkedEntityId: string | null
  linkedEntityLabel: string | null
  linkedEntityPath: string | null
  lastActivityAt: string
  latestActivityBody: string | null
  latestActivityKind: "comment" | "evidence_added" | "status_note" | null
  unreadCount: number
}

type DetailRow = {
  context: {
    id: string
    subject: string
    linkedEntityType: string | null
    linkedEntityId: string | null
    linkedEntityLabel: string | null
    linkedEntityPath: string | null
    lastActivityAt: string
    createdAt: string
    updatedAt: string
    createdByUserId: string
  }
  operators: Array<{
    userId: string
    name: string | null
    email: string
    role: string
  }>
  activities: Array<{
    id: string
    contextId: string
    kind: "comment" | "evidence_added" | "status_note"
    body: string
    evidence: Array<{
      blobPathname: string
      url: string
      downloadUrl: string | null
      contentType: string | null
      fileName: string
      fileSize: number | null
      kind: "file" | "screenshot"
    }>
    createdAt: string
    author: {
      userId: string
      name: string | null
      email: string
    }
  }>
}

function createMockCanvas() {
  return {
    toBlob(callback: (blob: Blob | null) => void) {
      callback(new Blob(["png"], { type: "image/png" }))
    },
  } as unknown as HTMLCanvasElement
}

function installCoordinationFetchMock() {
  const now = "2026-05-11T00:00:00.000Z"
  const contexts: ContextRow[] = []
  const details = new Map<string, DetailRow>()
  const operators = [
    {
      userId: "user-1",
      name: "Ops Lead",
      email: "ops@example.com",
      role: "admin",
    },
    {
      userId: "user-2",
      name: "Finance",
      email: "finance@example.com",
      role: "member",
    },
  ]

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method ?? "GET"

      if (url.endsWith("/api/erp/coordination/operators") && method === "GET") {
        return Response.json({ items: operators })
      }

      if (url.endsWith("/api/erp/coordination/contexts") && method === "GET") {
        return Response.json({ items: contexts })
      }

      if (url.endsWith("/api/erp/coordination/contexts") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          subject?: string
          operatorUserIds?: string[]
          body?: string
        }
        const contextId = `ctx-${contexts.length + 1}`
        const detail: DetailRow = {
          context: {
            id: contextId,
            subject: body.subject ?? "Operational context",
            linkedEntityType: null,
            linkedEntityId: null,
            linkedEntityLabel: null,
            linkedEntityPath: null,
            lastActivityAt: now,
            createdAt: now,
            updatedAt: now,
            createdByUserId: "user-1",
          },
          operators: operators.filter(
            (operator) =>
              operator.userId === "user-1" ||
              body.operatorUserIds?.includes(operator.userId)
          ),
          activities:
            body.body && body.body.length > 0
              ? [
                  {
                    id: "act-1",
                    contextId,
                    kind: "comment",
                    body: body.body,
                    evidence: [],
                    createdAt: now,
                    author: {
                      userId: "user-1",
                      name: "Ops Lead",
                      email: "ops@example.com",
                    },
                  },
                ]
              : [],
        }
        details.set(contextId, detail)
        contexts.push({
          id: contextId,
          subject: detail.context.subject,
          linkedEntityType: null,
          linkedEntityId: null,
          linkedEntityLabel: null,
          linkedEntityPath: null,
          lastActivityAt: now,
          latestActivityBody: body.body ?? null,
          latestActivityKind: body.body ? "comment" : null,
          unreadCount: 0,
        })
        return Response.json({ contextId }, { status: 201 })
      }

      if (
        url.includes("/api/erp/coordination/contexts/") &&
        !url.endsWith("/activity") &&
        !url.endsWith("/read") &&
        method === "GET"
      ) {
        const contextId = url.split("/").at(-1) ?? ""
        return Response.json(details.get(contextId))
      }

      if (url.endsWith("/read") && method === "POST") {
        return Response.json({ ok: true })
      }

      if (url.endsWith("/activity") && method === "POST") {
        const contextId = url.split("/").at(-2) ?? ""
        const body = JSON.parse(String(init?.body ?? "{}")) as {
          kind: "comment" | "evidence_added" | "status_note"
          body?: string
          evidence?: DetailRow["activities"][number]["evidence"]
        }
        const detail = details.get(contextId)
        if (!detail)
          return Response.json({ error: "Context not found" }, { status: 404 })
        const activity = {
          id: `act-${detail.activities.length + 1}`,
          contextId,
          kind: body.kind,
          body: body.body ?? "",
          evidence: body.evidence ?? [],
          createdAt: now,
          author: {
            userId: "user-1",
            name: "Ops Lead",
            email: "ops@example.com",
          },
        }
        detail.activities.push(activity)
        detail.context.lastActivityAt = now
        const context = contexts.find((item) => item.id === contextId)
        if (context) {
          context.lastActivityAt = now
          context.latestActivityBody =
            activity.body || activity.evidence[0]?.fileName || null
          context.latestActivityKind = activity.kind
        }
        return Response.json({ activityId: activity.id, createdAt: now })
      }

      throw new Error(`Unhandled fetch: ${method} ${url}`)
    }
  )

  vi.stubGlobal("fetch", fetchMock)
  return { contexts, details, fetchMock }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

/** Load after {@link vi.resetModules} so `#i18n/navigation` mocks win over prior test files' module cache. */
let CoordinationConsole: ComponentType<{ orgId: string }>

describe("OperationalCoordinationConsole", { timeout: 20_000 }, () => {
  beforeAll(async () => {
    vi.resetModules()
    const mod = await import("#features/coordination/client")
    CoordinationConsole = mod.OperationalCoordinationConsole
  })

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    document.body.innerHTML = `
      <div data-appshell-capture-root="workspace">workspace</div>
      <main id="dashboard-main" data-appshell-capture-root="content">content</main>
    `
    window.history.replaceState({}, "", "/en/o/acme/apps/home")
    uploadMock.mockResolvedValue({
      url: "https://blob.example/evidence.pdf",
      downloadUrl: "https://blob.example/evidence.pdf?download=1",
      pathname: "orgs/org-1/nexus-coordination/ctx-1/123-file-evidence.pdf",
      contentType: "application/pdf",
      contentDisposition: "inline",
    })
    html2canvasMock.mockResolvedValue(createMockCanvas())
  })

  it("creates a new operational context", async () => {
    installCoordinationFetchMock()

    render(
      <TooltipProvider>
        <CoordinationConsole orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Coordination" }))
    expect(
      await screen.findByRole("heading", {
        name: "Operational coordination",
      })
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "New context" }))
    fireEvent.change(screen.getByLabelText("Context title"), {
      target: { value: "Vendor payment hold" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Finance/i }))
    fireEvent.click(screen.getByRole("button", { name: "Create context" }))

    expect(await screen.findByText("Vendor payment hold")).toBeTruthy()
  })

  it("sends a coordination update with file evidence", async () => {
    const { fetchMock } = installCoordinationFetchMock()

    render(
      <TooltipProvider>
        <CoordinationConsole orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Coordination" }))
    fireEvent.click(await screen.findByRole("button", { name: "New context" }))
    fireEvent.change(screen.getByLabelText("Context title"), {
      target: { value: "Vendor payment hold" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Finance/i }))
    fireEvent.click(screen.getByRole("button", { name: "Create context" }))
    expect(await screen.findByText("Vendor payment hold")).toBeTruthy()

    fireEvent.change(await screen.findByLabelText("Add coordination update"), {
      target: { value: "Please review the certification mismatch." },
    })

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["pdf"], "evidence.pdf", { type: "application/pdf" })],
      },
    })

    fireEvent.click(screen.getByRole("button", { name: "Send update" }))

    await screen.findByText("Please review the certification mismatch.")
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(uploadMock.mock.calls[0]?.[0]).toMatch(
      /^orgs\/org-1\/nexus-coordination\/ctx-1\/\d+-file-evidence\.pdf$/
    )
    expect(
      JSON.parse(uploadMock.mock.calls[0]?.[2].clientPayload)
    ).toMatchObject({
      source: "nexus-utility-messenger",
      contextId: "ctx-1",
      evidenceKind: "file",
      routePath: "/en/o/acme/apps/home",
    })
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).endsWith("/activity") && init?.method === "POST"
      )
    ).toBe(true)
  })

  it("captures screenshot evidence for a coordination update", async () => {
    installCoordinationFetchMock()

    render(
      <TooltipProvider>
        <CoordinationConsole orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Coordination" }))
    fireEvent.click(await screen.findByRole("button", { name: "New context" }))
    fireEvent.change(screen.getByLabelText("Context title"), {
      target: { value: "Payroll anomaly" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Finance/i }))
    fireEvent.click(screen.getByRole("button", { name: "Create context" }))
    expect(await screen.findByText("Payroll anomaly")).toBeTruthy()

    await screen.findByLabelText("Add coordination update")

    fireEvent.click(screen.getByRole("button", { name: "Attach screenshot" }))
    expect(await screen.findByText(/screenshot-\d+\.png/i)).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Send update" }))

    await waitFor(() => {
      expect(uploadMock).toHaveBeenCalled()
    })
    expect(
      JSON.parse(uploadMock.mock.calls[0]?.[2].clientPayload)
    ).toMatchObject({
      source: "nexus-utility-messenger",
      contextId: "ctx-1",
      evidenceKind: "screenshot",
    })
  })

  it("blocks activity submission when evidence upload fails", async () => {
    const { fetchMock } = installCoordinationFetchMock()
    uploadMock.mockRejectedValue(new Error("Evidence upload failed"))

    render(
      <TooltipProvider>
        <CoordinationConsole orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Coordination" }))
    fireEvent.click(await screen.findByRole("button", { name: "New context" }))
    fireEvent.change(screen.getByLabelText("Context title"), {
      target: { value: "Audit follow-up" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Finance/i }))
    fireEvent.click(screen.getByRole("button", { name: "Create context" }))
    expect(await screen.findByText("Audit follow-up")).toBeTruthy()
    await screen.findByLabelText("Add coordination update")

    const fileInput = await waitFor(() => {
      const input = document.querySelector('input[type="file"]')
      expect(input).toBeTruthy()
      return input as HTMLInputElement
    })
    fireEvent.change(fileInput, {
      target: {
        files: [new File(["pdf"], "blocked.pdf", { type: "application/pdf" })],
      },
    })

    fireEvent.click(screen.getByRole("button", { name: "Send update" }))

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Evidence upload failed"
      )
    })
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) =>
          String(url).endsWith("/activity") && init?.method === "POST"
      )
    ).toBe(false)
  })
})
