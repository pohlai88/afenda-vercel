import { describe, expect, it } from "vitest"

import {
  buildOpenStatusFeedUrl,
  fallbackOpenStatusSnapshot,
  normalizeOpenStatusFeed,
  normalizeOpenStatusState,
} from "#features/legal-docs"

describe("OpenStatus public status mapping", () => {
  it("builds the public JSON feed URL from the status page URL", () => {
    expect(buildOpenStatusFeedUrl("https://status.nexuscanon.com/")).toBe(
      "https://status.nexuscanon.com/feed/json"
    )
  })

  it("normalizes known status labels into Afenda public states", () => {
    expect(normalizeOpenStatusState("operational")).toBe("operational")
    expect(normalizeOpenStatusState("partial outage")).toBe("degraded")
    expect(normalizeOpenStatusState("scheduled maintenance")).toBe(
      "maintenance"
    )
    expect(normalizeOpenStatusState("major incident")).toBe("incident")
    expect(normalizeOpenStatusState("unexpected")).toBe("unknown")
  })

  it("maps a public feed without leaking raw source structure", () => {
    const snapshot = normalizeOpenStatusFeed(
      {
        statusPage: {
          title: "Afenda Status",
          description: "Public status from OpenStatus.",
        },
        overallStatus: "operational",
        pageComponents: [
          {
            name: "Afenda health endpoint",
            status: "operational",
            description: "Redacted public health.",
          },
        ],
        statusReports: [
          {
            title: "API degradation",
            status: "identified",
            message: "Operators have identified the affected route.",
            date: "2026-05-09T08:00:00.000Z",
          },
        ],
        maintenances: [
          {
            title: "Database maintenance",
            status: "maintenance",
            startsAt: "2026-05-10T08:00:00.000Z",
          },
        ],
      },
      {
        publicStatusUrl: "https://status.nexuscanon.com",
        feedUrl: "https://status.nexuscanon.com/feed/json",
      }
    )

    expect(snapshot).toMatchObject({
      configured: true,
      available: true,
      title: "Afenda Status",
      overallStatus: "operational",
      components: [
        {
          name: "Afenda health endpoint",
          status: "operational",
          description: "Redacted public health.",
        },
      ],
      incidents: [
        {
          title: "API degradation",
          status: "identified",
          message: "Operators have identified the affected route.",
        },
      ],
      maintenances: [
        {
          title: "Database maintenance",
          status: "maintenance",
        },
      ],
    })
  })

  it("keeps the wrapper neutral when OpenStatus is not configured", () => {
    const snapshot = fallbackOpenStatusSnapshot({
      reason: "missing-config",
    })

    expect(snapshot).toMatchObject({
      configured: false,
      available: false,
      publicStatusUrl: null,
      overallStatus: "unknown",
      fallbackReason: "missing-config",
    })
  })
})
