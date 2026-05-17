// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { toBlobMock, uploadMock } = vi.hoisted(() => ({
  toBlobMock: vi.fn(),
  uploadMock: vi.fn(),
}))

const TRANSLATIONS: Record<string, string> = {
  "Dashboard.shell.utilityBar.screenshot.trigger": "Screenshot",
  "Dashboard.shell.utilityBar.screenshot.tooltip":
    "Capture the current workspace view",
  "Dashboard.shell.utilityBar.screenshot.title": "Screenshot",
  "Dashboard.shell.utilityBar.screenshot.description":
    "Capture the current workspace or content view, then upload one governed PNG.",
  "Dashboard.shell.utilityBar.screenshot.modeLabel": "Capture",
  "Dashboard.shell.utilityBar.screenshot.mode.workspace": "Workspace",
  "Dashboard.shell.utilityBar.screenshot.mode.content": "Content",
  "Dashboard.shell.utilityBar.screenshot.emptyState":
    "Capture the current view to review it before upload.",
  "Dashboard.shell.utilityBar.screenshot.previewAlt": "Screenshot preview",
  "Dashboard.shell.utilityBar.screenshot.previewReady":
    "{mode} capture ready for upload.",
  "Dashboard.shell.utilityBar.screenshot.capture": "Capture",
  "Dashboard.shell.utilityBar.screenshot.capturing": "Capturing…",
  "Dashboard.shell.utilityBar.screenshot.retake": "Retake",
  "Dashboard.shell.utilityBar.screenshot.clear": "Clear",
  "Dashboard.shell.utilityBar.screenshot.upload": "Upload PNG",
  "Dashboard.shell.utilityBar.screenshot.uploading": "Uploading…",
  "Dashboard.shell.utilityBar.screenshot.openFile": "Open file",
  "Dashboard.shell.utilityBar.screenshot.successTitle": "Screenshot uploaded",
  "Dashboard.shell.utilityBar.screenshot.successDescription":
    "The PNG is now available in blob storage for this workspace.",
  "Dashboard.shell.utilityBar.screenshot.errorTargetMissing":
    "The selected capture area is not available on this screen.",
  "Dashboard.shell.utilityBar.screenshot.errorNoCapture":
    "Capture a screenshot first.",
  "Dashboard.shell.utilityBar.screenshot.errorCapture":
    "Screenshot capture failed. Try again.",
  "Dashboard.shell.utilityBar.screenshot.errorUpload":
    "Screenshot upload failed. Try again.",
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

vi.mock("html-to-image", () => ({
  toBlob: toBlobMock,
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

import { AppShellNexusUtilityScreenshot } from "#app-shell/client"
import { TooltipProvider } from "#components2/ui/tooltip"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe("AppShellNexusUtilityScreenshot", () => {
  beforeEach(() => {
    toBlobMock.mockReset()
    toBlobMock.mockResolvedValue(new Blob(["png"], { type: "image/png" }))
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
    window.history.replaceState({}, "", "/en/o/acme/dashboard/home")
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:preview")
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
  })

  it("captures the workspace view and uploads the screenshot", async () => {
    uploadMock.mockResolvedValue({
      url: "https://blob.example/workspace.png",
      downloadUrl: "https://blob.example/workspace.png?download=1",
      pathname: "orgs/org-1/nexus-screenshot/workspace-123.png",
      contentType: "image/png",
      contentDisposition: "inline",
    })

    render(
      <TooltipProvider>
        <AppShellNexusUtilityScreenshot orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Screenshot" }))
    fireEvent.click(screen.getByRole("button", { name: "Capture" }))

    expect(
      await screen.findByText("Workspace capture ready for upload.")
    ).toBeTruthy()
    expect(toBlobMock).toHaveBeenCalledWith(
      document.querySelector('[data-appshell-capture-root="workspace"]'),
      expect.objectContaining({
        pixelRatio: expect.any(Number),
      })
    )

    fireEvent.click(screen.getByRole("button", { name: "Upload PNG" }))

    expect(await screen.findByText("Screenshot uploaded")).toBeTruthy()
    expect(uploadMock.mock.calls[0]?.[0]).toMatch(
      /^orgs\/org-1\/nexus-screenshot\/workspace-\d+\.png$/
    )
    expect(
      JSON.parse(uploadMock.mock.calls[0]?.[2].clientPayload)
    ).toMatchObject({
      source: "nexus-utility-screenshot",
      captureMode: "workspace",
      mimeType: "image/png",
      routePath: "/en/o/acme/dashboard/home",
    })
  })

  it("captures the content view when content mode is selected", async () => {
    render(
      <TooltipProvider>
        <AppShellNexusUtilityScreenshot orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Screenshot" }))
    fireEvent.click(screen.getByRole("radio", { name: "Content" }))
    fireEvent.click(screen.getByRole("button", { name: "Capture" }))

    expect(
      await screen.findByText("Content capture ready for upload.")
    ).toBeTruthy()
    expect(toBlobMock).toHaveBeenCalledWith(
      document.querySelector('[data-appshell-capture-root="content"]'),
      expect.any(Object)
    )
  })

  it("shows inline capture failures", async () => {
    toBlobMock.mockRejectedValue(new Error("Capture crashed"))

    render(
      <TooltipProvider>
        <AppShellNexusUtilityScreenshot orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Screenshot" }))
    fireEvent.click(screen.getByRole("button", { name: "Capture" }))

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Capture crashed")
    })
  })

  it("resets the preview when cleared", async () => {
    render(
      <TooltipProvider>
        <AppShellNexusUtilityScreenshot orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Screenshot" }))
    fireEvent.click(screen.getByRole("button", { name: "Capture" }))
    expect(
      await screen.findByText("Workspace capture ready for upload.")
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Clear" }))

    await waitFor(() => {
      expect(
        screen.queryByText("Workspace capture ready for upload.")
      ).toBeNull()
    })
    expect(
      await screen.findByText(
        "Capture the current view to review it before upload."
      )
    ).toBeTruthy()
  })

  it("shows inline upload failures", async () => {
    uploadMock.mockRejectedValue(new Error("Upload screenshot failed"))

    render(
      <TooltipProvider>
        <AppShellNexusUtilityScreenshot orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Screenshot" }))
    fireEvent.click(screen.getByRole("button", { name: "Capture" }))
    expect(
      await screen.findByText("Workspace capture ready for upload.")
    ).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Upload PNG" }))

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Upload screenshot failed"
      )
    })
  })
})
