// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { RouteErrorDebugPanel } from "#components/dev/route-error-debug-panel"

describe("RouteErrorDebugPanel", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("NEXT_PUBLIC_DEV_ERROR_PANEL", "")
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("returns null when NODE_ENV is not development", () => {
    vi.stubEnv("NODE_ENV", "production")
    const err = new Error("boom")
    const { container } = render(
      <RouteErrorDebugPanel segment="auth" error={err} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("returns null when NEXT_PUBLIC_DEV_ERROR_PANEL is 0", () => {
    vi.stubEnv("NEXT_PUBLIC_DEV_ERROR_PANEL", "0")
    const err = new Error("boom")
    const { container } = render(
      <RouteErrorDebugPanel segment="auth" error={err} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("renders error name and stack in development", async () => {
    const err = new Error("boom")
    err.stack = "Error: boom\n  at test.ts:1:1"
    render(<RouteErrorDebugPanel segment="auth" error={err} />)

    await waitFor(() => {
      expect(screen.getByTestId("route-error-debug-panel")).toBeTruthy()
    })
    expect(screen.getByText("Error")).toBeTruthy()
    expect(screen.getByText("boom")).toBeTruthy()
    expect(screen.getByText(/at test\.ts/)).toBeTruthy()
  })

  it("copies diagnostics JSON including segment and digest", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", {
      ...navigator,
      clipboard: { writeText },
    })

    const err = Object.assign(new Error("fail"), { digest: "abc123" })
    err.stack = "stack-line"

    render(<RouteErrorDebugPanel segment="auth" error={err} />)

    const panel = await waitFor(() =>
      screen.getByTestId("route-error-debug-panel")
    )

    fireEvent.click(
      within(panel).getByRole("button", { name: /copy diagnostics json/i })
    )

    await waitFor(() => {
      expect(writeText).toHaveBeenCalled()
    })

    const payload = writeText.mock.calls[0][0] as string
    const parsed = JSON.parse(payload) as {
      segment: string
      error: { name: string; message: string; stack?: string; digest?: string }
      href: string
      ts: string
    }
    expect(parsed.segment).toBe("auth")
    expect(parsed.error.name).toBe("Error")
    expect(parsed.error.message).toBe("fail")
    expect(parsed.error.digest).toBe("abc123")
    expect(parsed.error.stack).toBe("stack-line")
    expect(parsed.ts).toMatch(/^\d{4}-/)
    expect(typeof parsed.href).toBe("string")
  })
})
