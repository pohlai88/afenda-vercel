// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { captureException } = vi.hoisted(() => ({
  captureException: vi.fn(),
}))

vi.mock("@sentry/nextjs", () => ({
  captureException,
}))

import type { RouteErrorSegment } from "../../components2/route-error/use-report-route-error"
import { useReportRouteError } from "../../components2/route-error/use-report-route-error"

function Probe({
  segment,
  error,
}: {
  segment: RouteErrorSegment
  error: Error & { digest?: string }
}) {
  useReportRouteError({ segment, error })
  return null
}

describe("useReportRouteError", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "")
    captureException.mockClear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("logs a prefixed console.error with segment", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    const err = new Error("x")

    render(<Probe segment="auth" error={err} />)

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("[route-error:auth]", err)
    })
    spy.mockRestore()
  })

  it("reports to Sentry when NEXT_PUBLIC_SENTRY_DSN is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://example@sentry.io/1")
    const err = Object.assign(new Error("y"), { digest: "d1" })

    render(<Probe segment="locale" error={err} />)

    await waitFor(() => {
      expect(captureException).toHaveBeenCalledWith(err, {
        tags: { segment: "locale", digest: "d1" },
      })
    })
  })
})
