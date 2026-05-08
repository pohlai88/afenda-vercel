import { and, eq, gt } from "drizzle-orm"

import { authMailContext, sendAuthEmail } from "#lib/auth-mail"
import {
  verifyNeonAuthWebhookSignature,
  writeIamAuditEvent,
} from "#lib/auth-v2"
import { db } from "#lib/db"
import { neonAuthInvitation } from "#lib/db/schema-neon-auth"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch {
    return routeJsonError("Invalid body", 400)
  }

  let payload: Awaited<ReturnType<typeof verifyNeonAuthWebhookSignature>>
  try {
    payload = await verifyNeonAuthWebhookSignature(rawBody, request.headers)
  } catch {
    return routeJsonError("Unauthorized", 401)
  }

  try {
    switch (payload.event_type) {
      case "send.otp": {
        const email = payload.user?.email
        const otpCode = String(payload.event_data?.otp_code ?? "")
        const otpType = String(payload.event_data?.otp_type ?? "sign-in")
        if (email && otpCode) {
          const { siteName } = authMailContext()
          sendAuthEmail({
            to: email,
            subject: `${siteName} — verification code`,
            text: `Your ${otpType} code is: ${otpCode}`,
          })
        }
        return routeJsonOk({ ok: true })
      }
      case "send.magic_link": {
        const email = payload.user?.email
        const linkUrl = String(payload.event_data?.link_url ?? "")
        if (email && linkUrl) {
          const { siteName } = authMailContext()
          sendAuthEmail({
            to: email,
            subject: `${siteName} — magic sign-in link`,
            text: `Use this link to continue: ${linkUrl}`,
            html: `<p>Use this link to continue:</p><p><a href="${linkUrl}">${linkUrl}</a></p>`,
          })
        }
        return routeJsonOk({ ok: true })
      }
      case "user.before_create": {
        if (process.env.BETTER_AUTH_INVITE_ONLY_SIGNUP === "1") {
          const email = payload.user?.email?.trim().toLowerCase()
          if (!email) {
            return routeJsonOk({
              allowed: false,
              error_code: "INVITE_REQUIRED",
              error_message: "Invite required to create an account.",
            })
          }
          const [invite] = await db
            .select({ id: neonAuthInvitation.id })
            .from(neonAuthInvitation)
            .where(
              and(
                eq(neonAuthInvitation.email, email),
                eq(neonAuthInvitation.status, "pending"),
                gt(neonAuthInvitation.expiresAt, new Date())
              )
            )
            .limit(1)
          if (!invite) {
            return routeJsonOk({
              allowed: false,
              error_code: "INVITE_REQUIRED",
              error_message: "Invite required to create an account.",
            })
          }
        }
        return routeJsonOk({ allowed: true })
      }
      case "user.created": {
        if (payload.user?.id) {
          await writeIamAuditEvent({
            action: "iam.user.create",
            actorUserId: payload.user.id,
            metadata: payload.event_data ?? undefined,
          })
        }
        return routeJsonOk({ ok: true })
      }
      default:
        return routeJsonOk({ ok: true })
    }
  } catch (err) {
    console.error("[neon-auth-webhooks]", err)
    return routeJsonError("Internal Server Error", 500)
  }
}
