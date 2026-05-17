/** Server-only email helper for IAM flows; avoid `import "server-only"` so tooling/tests can import safely. */
import { Resend } from "resend"

import { getSiteUrl } from "#lib/site"

const resendApiKey = process.env.RESEND_API_KEY?.trim()
const resendFrom =
  process.env.RESEND_FROM?.trim() ?? "Afenda <onboarding@resend.dev>"

function getResend(): Resend | null {
  if (!resendApiKey) return null
  return new Resend(resendApiKey)
}

function fireAndForget(p: Promise<unknown>): void {
  void p.catch((err: unknown) => {
    // This module avoids server-only so it stays test-importable; the logger
    // (#lib/logger.server) is Node+server-only and cannot be used here.
    // eslint-disable-next-line no-console
    console.error("[auth-mail]", err)
  })
}

export function sendAuthEmail(input: {
  to: string
  subject: string
  text: string
  html?: string
}): void {
  const client = getResend()
  if (!client) {
    if (process.env.NODE_ENV !== "production") {
      // Dev-only guidance when RESEND_API_KEY is absent; not a production log path.
      // eslint-disable-next-line no-console
      console.info(
        "[auth-mail] (no RESEND_API_KEY)",
        input.subject,
        "→",
        input.to
      )
    }
    return
  }

  fireAndForget(
    client.emails.send({
      from: resendFrom,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    })
  )
}

export function authMailContext(): { siteUrl: string; siteName: string } {
  return { siteUrl: getSiteUrl(), siteName: "Afenda" }
}
