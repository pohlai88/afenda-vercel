// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { uploadMock } = vi.hoisted(() => ({
  uploadMock: vi.fn(),
}))

const TRANSLATIONS: Record<string, string> = {
  "Dashboard.shell.utilityBar.upload.trigger": "Upload",
  "Dashboard.shell.utilityBar.upload.tooltip":
    "Upload a file into the current workspace",
  "Dashboard.shell.utilityBar.upload.title": "Upload",
  "Dashboard.shell.utilityBar.upload.description":
    "Send one file into the current workspace's governed blob intake.",
  "Dashboard.shell.utilityBar.upload.fileInputLabel": "Choose a file to upload",
  "Dashboard.shell.utilityBar.upload.emptyState": "Select one file to upload",
  "Dashboard.shell.utilityBar.upload.acceptedTypes":
    "Accepted: JPG, PNG, WEBP, or PDF.",
  "Dashboard.shell.utilityBar.upload.selectedMeta": "{size}",
  "Dashboard.shell.utilityBar.upload.chooseFile": "Choose file",
  "Dashboard.shell.utilityBar.upload.replaceFile": "Replace file",
  "Dashboard.shell.utilityBar.upload.submit": "Upload file",
  "Dashboard.shell.utilityBar.upload.uploading": "Uploading…",
  "Dashboard.shell.utilityBar.upload.progressAria": "Upload progress",
  "Dashboard.shell.utilityBar.upload.progressValue": "{percentage}% uploaded",
  "Dashboard.shell.utilityBar.upload.successTitle": "Upload complete",
  "Dashboard.shell.utilityBar.upload.successDescription":
    "{fileName} is now available in blob storage for this workspace.",
  "Dashboard.shell.utilityBar.upload.openFile": "Open file",
  "Dashboard.shell.utilityBar.upload.uploadAnother": "Upload another",
  "Dashboard.shell.utilityBar.upload.errorNoFile": "Choose one file first.",
  "Dashboard.shell.utilityBar.upload.errorGeneric": "Upload failed. Try again.",
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

import { AppShellNexusUtilityUpload } from "#app-shell/client"
import { TooltipProvider } from "#components2/ui/tooltip"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("AppShellNexusUtilityUpload", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/en/o/acme/dashboard/home")
  })

  it("uploads a selected file and shows success feedback", async () => {
    uploadMock.mockImplementation(async (_pathname, _file, options) => {
      options.onUploadProgress?.({ loaded: 50, total: 100, percentage: 50 })
      return {
        url: "https://blob.example/report.pdf",
        downloadUrl: "https://blob.example/report.pdf?download=1",
        pathname: "orgs/org-1/nexus-utility/123-report.pdf",
        contentType: "application/pdf",
        contentDisposition: "inline",
      }
    })

    render(
      <TooltipProvider>
        <AppShellNexusUtilityUpload orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Upload" }))

    const input = screen.getByLabelText("Choose a file to upload")
    const file = new File(["report"], "report.pdf", {
      type: "application/pdf",
    })
    fireEvent.change(input, { target: { files: [file] } })

    fireEvent.click(screen.getByRole("button", { name: "Upload file" }))

    expect(await screen.findByText("Upload complete")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "Open file" }).getAttribute("href")
    ).toBe("https://blob.example/report.pdf")

    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(uploadMock.mock.calls[0]?.[0]).toMatch(
      /^orgs\/org-1\/nexus-utility\/\d+-report\.pdf$/
    )
    expect(
      JSON.parse(uploadMock.mock.calls[0]?.[2].clientPayload)
    ).toMatchObject({
      source: "nexus-utility-right-rail",
      fileName: "report.pdf",
      mimeType: "application/pdf",
      routePath: "/en/o/acme/dashboard/home",
    })
  })

  it("shows inline failure feedback when upload fails", async () => {
    uploadMock.mockRejectedValue(new Error("Upload failed hard"))

    render(
      <TooltipProvider>
        <AppShellNexusUtilityUpload orgId="org-1" />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByRole("button", { name: "Upload" }))
    fireEvent.change(screen.getByLabelText("Choose a file to upload"), {
      target: {
        files: [new File(["x"], "broken.pdf", { type: "application/pdf" })],
      },
    })

    fireEvent.click(screen.getByRole("button", { name: "Upload file" }))

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Upload failed hard"
      )
    })
  })
})
