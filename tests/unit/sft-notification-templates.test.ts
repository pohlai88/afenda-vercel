import { describe, expect, it } from "vitest"

import {
  buildSftAssignmentChangedTemplate,
  buildSftScheduleChangeResolvedTemplate,
  buildSftSwapResolvedTemplate,
} from "../../lib/features/hrm/time-attendance/shift-scheduling/data/sft-notification-templates.shared"

describe("sft notification templates", () => {
  it("builds assignment changed email with workbench link", () => {
    const message = buildSftAssignmentChangedTemplate({
      attendanceDate: "2026-05-21",
      templateName: "Day shift",
      workbenchUrl: "https://app.example/en/o/acme/apps/hrm/shift-scheduling",
    })

    expect(message.inApp.title).toBe("Shift schedule updated")
    expect(message.email.subject).toContain("2026-05-21")
    expect(message.email.html).toContain("Day shift")
    expect(message.email.text).toContain("https://app.example")
  })

  it("builds swap returned template", () => {
    const message = buildSftSwapResolvedTemplate({
      outcome: "returned",
      workbenchUrl: "https://app.example/workbench",
    })

    expect(message.inApp.title).toBe("Shift swap returned")
    expect(message.email.subject).toContain("returned")
  })

  it("builds schedule change approved with shift detail", () => {
    const message = buildSftScheduleChangeResolvedTemplate({
      outcome: "approved",
      proposedDate: "2026-06-01",
      proposedTemplateCode: "DAY",
      managerNote: "OK",
      workbenchUrl: "https://app.example/workbench",
    })

    expect(message.inApp.title).toContain("2026-06-01")
    expect(message.inApp.title).toContain("DAY")
    expect(message.email.text).toContain("Manager note: OK")
  })
})
