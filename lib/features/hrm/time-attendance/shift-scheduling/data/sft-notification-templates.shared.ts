export type SftNotificationChannelMessage = {
  readonly title: string
  readonly body: string
}

export type SftEmailTemplateMessage = {
  readonly subject: string
  readonly text: string
  readonly html: string
}

export type SftNotificationTemplateMessage = {
  readonly inApp: SftNotificationChannelMessage
  readonly email: SftEmailTemplateMessage
}

function emailHtml(lines: readonly string[]): string {
  return lines.map((line) => `<p>${line}</p>`).join("")
}

export function buildSftRosterPublishedTemplate(input: {
  readonly periodStart: string
  readonly periodEnd: string
  readonly note?: string | null
  readonly workbenchUrl: string
}): SftNotificationTemplateMessage {
  const noteSuffix = input.note?.trim() ? ` Note: ${input.note.trim()}` : ""
  const inAppBody = `Your shift roster for ${input.periodStart} through ${input.periodEnd} is published.${noteSuffix}`
  return {
    inApp: {
      title: "Shift roster published",
      body: inAppBody,
    },
    email: {
      subject: `Shift roster published (${input.periodStart} – ${input.periodEnd})`,
      text: [
        "Afenda Shift Scheduling",
        inAppBody,
        `Open shift scheduling: ${input.workbenchUrl}`,
      ].join("\n"),
      html: emailHtml([
        "<strong>Afenda Shift Scheduling</strong>",
        inAppBody,
        `<a href="${input.workbenchUrl}">Open shift scheduling</a>`,
      ]),
    },
  }
}

export function buildSftAssignmentChangedTemplate(input: {
  readonly attendanceDate: string
  readonly templateName: string
  readonly workbenchUrl: string
}): SftNotificationTemplateMessage {
  const inAppBody = `Your shift on ${input.attendanceDate} is now ${input.templateName}.`
  return {
    inApp: {
      title: "Shift schedule updated",
      body: inAppBody,
    },
    email: {
      subject: `Shift updated: ${input.attendanceDate}`,
      text: [
        "Afenda Shift Scheduling",
        inAppBody,
        `View roster: ${input.workbenchUrl}`,
      ].join("\n"),
      html: emailHtml([
        "<strong>Afenda Shift Scheduling</strong>",
        inAppBody,
        `<a href="${input.workbenchUrl}">View roster</a>`,
      ]),
    },
  }
}

export function buildSftSwapResolvedTemplate(input: {
  readonly outcome: "approved" | "rejected" | "returned" | "overridden"
  readonly workbenchUrl: string
}): SftNotificationTemplateMessage {
  const title =
    input.outcome === "approved"
      ? "Shift swap approved"
      : input.outcome === "rejected"
        ? "Shift swap rejected"
        : input.outcome === "returned"
          ? "Shift swap returned"
          : "Shift swap updated"

  const body =
    input.outcome === "approved"
      ? "Your shift swap request was approved."
      : input.outcome === "rejected"
        ? "Your shift swap request was rejected."
        : input.outcome === "returned"
          ? "Your shift swap request was returned for changes."
          : "A manager updated your shift swap request."

  return {
    inApp: { title, body },
    email: {
      subject: `Shift swap: ${title}`,
      text: [
        "Afenda Shift Scheduling",
        body,
        `Open: ${input.workbenchUrl}`,
      ].join("\n"),
      html: emailHtml([
        "<strong>Afenda Shift Scheduling</strong>",
        body,
        `<a href="${input.workbenchUrl}">Open shift scheduling</a>`,
      ]),
    },
  }
}

export function buildSftScheduleChangeResolvedTemplate(input: {
  readonly outcome: "approved" | "rejected" | "returned"
  readonly proposedDate?: string
  readonly proposedTemplateCode?: string
  readonly managerNote?: string | null
  readonly workbenchUrl: string
}): SftNotificationTemplateMessage {
  const shiftDetail =
    input.proposedDate && input.proposedTemplateCode
      ? ` (${input.proposedDate} · ${input.proposedTemplateCode})`
      : input.proposedDate
        ? ` (${input.proposedDate})`
        : ""
  const noteSuffix = input.managerNote?.trim()
    ? ` Manager note: ${input.managerNote.trim()}`
    : ""

  const title =
    input.outcome === "approved"
      ? `Schedule change approved${shiftDetail}`
      : input.outcome === "rejected"
        ? `Schedule change rejected${shiftDetail}`
        : `Schedule change returned${shiftDetail}`

  const body =
    input.outcome === "approved"
      ? `Your schedule change request was approved and applied.${noteSuffix}`
      : input.outcome === "rejected"
        ? `Your schedule change request was rejected.${noteSuffix}`
        : `Your schedule change request was returned — revise and resubmit.${noteSuffix}`

  return {
    inApp: { title, body },
    email: {
      subject: `Schedule change: ${title}`,
      text: [
        "Afenda Shift Scheduling",
        body,
        `Open: ${input.workbenchUrl}`,
      ].join("\n"),
      html: emailHtml([
        "<strong>Afenda Shift Scheduling</strong>",
        body,
        `<a href="${input.workbenchUrl}">Open shift scheduling</a>`,
      ]),
    },
  }
}
