/** Server-only by usage (`lib/auth/config.server.ts`). Avoid `import "server-only"` so `pnpm auth:generate` can load the config. */
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
