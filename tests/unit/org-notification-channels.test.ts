import { describe, expect, it } from "vitest"

import {
  ORG_NOTIFICATION_REALTIME_EVENT,
  orgNotificationUserChannelName,
} from "#features/org-notifications/client"

describe("org notification delivery channels", () => {
  it("builds a per-user Ably channel name", () => {
    expect(
      orgNotificationUserChannelName("org-1", "user-2")
    ).toBe("private-org-notification:org-1:user-2")
  })

  it("uses a stable realtime event name", () => {
    expect(ORG_NOTIFICATION_REALTIME_EVENT).toBe("org-notification")
  })
})
