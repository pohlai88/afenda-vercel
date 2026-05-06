import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import {
  admin,
  emailOTP,
  magicLink,
  organization,
  twoFactor,
  username,
} from "better-auth/plugins"
import { passkey } from "@better-auth/passkey"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { and, eq, gt } from "drizzle-orm"

import { authMailContext, sendAuthEmail } from "#lib/auth-mail"
import { db } from "#lib/db"
import * as schema from "#lib/db/schema"
import { getSiteUrl } from "#lib/site"

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build"

function trustedOriginsFromEnv(): string[] {
  const out = new Set<string>()
  const base = process.env.BETTER_AUTH_URL?.trim()
  if (base) out.add(base.replace(/\/$/, ""))
  out.add(getSiteUrl())
  const csv = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.trim()
  if (csv) {
    for (const o of csv.split(",")) {
      const x = o.trim()
      if (x) out.add(x.replace(/\/$/, ""))
    }
  }
  return [...out]
}

function parseAdminUserIds(): string[] {
  const raw = process.env.BETTER_AUTH_ADMIN_USER_IDS?.trim()
  if (!raw) return []
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function authBaseUrl(): string {
  return (
    process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") ||
    getSiteUrl().replace(/\/$/, "")
  )
}

function passkeyOrigin(): string {
  return authBaseUrl()
}

function passkeyRpId(): string {
  const explicit = process.env.PASSKEY_RP_ID?.trim()
  if (explicit) return explicit
  try {
    return new URL(`${passkeyOrigin()}/`).hostname
  } catch {
    return "localhost"
  }
}

function socialProviders(): Record<
  string,
  { clientId: string; clientSecret: string }
> {
  const providers: Record<string, { clientId: string; clientSecret: string }> =
    {}
  const ghId =
    process.env.GITHUB_CLIENT_ID?.trim() ||
    process.env.BETTER_AUTH_GITHUB_CLIENT_ID?.trim()
  const ghSecret =
    process.env.GITHUB_CLIENT_SECRET?.trim() ||
    process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET?.trim()
  if (ghId && ghSecret) {
    providers.github = { clientId: ghId, clientSecret: ghSecret }
  }
  const gId =
    process.env.GOOGLE_CLIENT_ID?.trim() ||
    process.env.BETTER_AUTH_GOOGLE_CLIENT_ID?.trim()
  const gSecret =
    process.env.GOOGLE_CLIENT_SECRET?.trim() ||
    process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET?.trim()
  if (gId && gSecret) {
    providers.google = { clientId: gId, clientSecret: gSecret }
  }
  return providers
}

const mailCtx = authMailContext()
const adminIds = parseAdminUserIds()
const inviteOnlySignup = process.env.BETTER_AUTH_INVITE_ONLY_SIGNUP === "1"

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    camelCase: true,
  }),
  trustedOrigins: trustedOriginsFromEnv(),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (isProductionBuild
      ? "build-phase-placeholder-secret-min-32-chars!!"
      : undefined),
  baseURL:
    process.env.BETTER_AUTH_URL ??
    (isProductionBuild ? "http://localhost:3000" : undefined),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 5,
  },
  socialProviders: socialProviders(),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      sendAuthEmail({
        to: user.email,
        subject: `${mailCtx.siteName} — reset your password`,
        text: `Reset your password: ${url}`,
        html: `<p>Reset your password:</p><p><a href="${url}">${url}</a></p>`,
      })
    },
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      sendAuthEmail({
        to: user.email,
        subject: `Verify your email — ${mailCtx.siteName}`,
        text: `Verify: ${url}`,
        html: `<p>Verify your email:</p><p><a href="${url}">${url}</a></p>`,
      })
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (!inviteOnlySignup || ctx.path !== "/sign-up/email") return
      const email =
        typeof ctx.body?.email === "string"
          ? ctx.body.email.trim().toLowerCase()
          : null

      if (!email) {
        throw new APIError("BAD_REQUEST", { message: "Email is required." })
      }

      const [invite] = await db
        .select({ id: schema.invitation.id })
        .from(schema.invitation)
        .where(
          and(
            eq(schema.invitation.email, email),
            eq(schema.invitation.status, "pending"),
            gt(schema.invitation.expiresAt, new Date()),
          ),
        )
        .limit(1)

      if (!invite) {
        throw new APIError("FORBIDDEN", {
          message: "Invite required to create an account.",
        })
      }
    }),
  },
  plugins: [
    organization(),
    admin({
      adminUserIds: adminIds.length > 0 ? adminIds : undefined,
    }),
    emailOTP({
      sendVerificationOTP: async ({ email, otp, type }) => {
        const subject =
          type === "sign-in"
            ? `${mailCtx.siteName} — sign-in code`
            : type === "forget-password"
              ? `${mailCtx.siteName} — password reset code`
              : type === "change-email"
                ? `${mailCtx.siteName} — email change code`
                : `${mailCtx.siteName} — verification code`
        sendAuthEmail({
          to: email,
          subject,
          text: `Your code: ${otp}`,
        })
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        sendAuthEmail({
          to: email,
          subject: `${mailCtx.siteName} — sign-in link`,
          text: `Sign in: ${url}`,
          html: `<p>Sign in:</p><p><a href="${url}">${url}</a></p>`,
        })
      },
    }),
    twoFactor(),
    username(),
    passkey({
      rpID: passkeyRpId(),
      rpName: mailCtx.siteName,
      origin: passkeyOrigin(),
    }),
    nextCookies(),
  ],
})
