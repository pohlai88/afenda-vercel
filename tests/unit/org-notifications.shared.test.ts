import { describe, expect, it } from "vitest"

import {
  compareOrgNotificationsForDisplay,
  isOrgNotificationActiveAt,
} from "#features/org-notifications"

describe("org notifications shared helpers", () => {
  it("treats future, expired, and closed notices as inactive", () => {
    const now = new Date("2026-05-11T10:00:00.000Z")

    expect(
      isOrgNotificationActiveAt(now, {
        publishedAt: new Date("2026-05-11T09:00:00.000Z"),
        expiresAt: null,
        closedAt: null,
      })
    ).toBe(true)

    expect(
      isOrgNotificationActiveAt(now, {
        publishedAt: new Date("2026-05-11T11:00:00.000Z"),
        expiresAt: null,
        closedAt: null,
      })
    ).toBe(false)

    expect(
      isOrgNotificationActiveAt(now, {
        publishedAt: new Date("2026-05-11T09:00:00.000Z"),
        expiresAt: new Date("2026-05-11T09:59:59.000Z"),
        closedAt: null,
      })
    ).toBe(false)

    expect(
      isOrgNotificationActiveAt(now, {
        publishedAt: new Date("2026-05-11T09:00:00.000Z"),
        expiresAt: null,
        closedAt: new Date("2026-05-11T09:30:00.000Z"),
      })
    ).toBe(false)
  })

  it("sorts active notices by severity before published time", () => {
    const ordered = [
      {
        id: "info-newer",
        severity: "info" as const,
        publishedAt: "2026-05-11T10:00:00.000Z",
      },
      {
        id: "critical-older",
        severity: "critical" as const,
        publishedAt: "2026-05-11T08:00:00.000Z",
      },
      {
        id: "warning-newer",
        severity: "warning" as const,
        publishedAt: "2026-05-11T09:00:00.000Z",
      },
      {
        id: "critical-newer",
        severity: "critical" as const,
        publishedAt: "2026-05-11T11:00:00.000Z",
      },
    ].sort(compareOrgNotificationsForDisplay)

    expect(ordered.map((item) => item.id)).toEqual([
      "critical-newer",
      "critical-older",
      "warning-newer",
      "info-newer",
    ])
  })
})
