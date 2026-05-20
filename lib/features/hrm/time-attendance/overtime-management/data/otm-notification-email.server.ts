import "server-only"

import { eq } from "drizzle-orm"
import { Resend } from "resend"

import { db } from "#lib/db"
import { neonAuthUser } from "#lib/db/schema-neon-auth"

const resendApiKey = process.env.RESEND_API_KEY?.trim()
const resendFrom =
  process.env.RESEND_FROM?.trim() ?? "Afenda <onboarding@resend.dev>"

function getResend(): Resend | null {
  if (!resendApiKey) return null
  return new Resend(resendApiKey)
}

export async function resolveOtmUserEmail(
  userId: string
): Promise<string | null> {
  const row = await db
    .select({ email: neonAuthUser.email })
    .from(neonAuthUser)
    .where(eq(neonAuthUser.id, userId))
    .limit(1)

  return row[0]?.email ?? null
}

/** Best-effort email; must not roll back overtime mutations. */
export function sendOtmLifecycleEmail(input: {
  to: string
  subject: string
  text: string
}): void {
  const client = getResend()
  if (!client) return

  void client.emails
    .send({
      from: resendFrom,
      to: input.to,
      subject: input.subject,
      text: input.text,
    })
    .catch(() => {
      // Delivery failure is non-fatal for ERP mutations.
    })
}
