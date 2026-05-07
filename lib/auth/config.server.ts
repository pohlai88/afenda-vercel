import { betterAuth, type BetterAuthPlugin } from "better-auth"
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
import { dash, sentinel } from "@better-auth/infra"
import { APIError, createAuthMiddleware } from "better-auth/api"
import { and, eq, gt } from "drizzle-orm"

import { authMailContext, sendAuthEmail } from "#lib/auth-mail"
import { db } from "#lib/db"
import { DEFAULT_APP_LOCALE, toLocalePath } from "#lib/i18n/locales.shared"
import * as schema from "#lib/db/schema"
import {
  betterAuthAllowedHostsFromEnv,
  betterAuthTrustedOriginsFromEnv,
  getSiteUrl,
} from "#lib/site"

import {
  resolveIamSessionLifecycleAudit,
  writeIamAuditEventFromHeaders,
} from "./audit.server"
import { AUTH_SESSION_FRESH_AGE_SECONDS } from "./session-policy.server"

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build"

function parseAdminUserIds(): string[] {
  const raw = process.env.BETTER_AUTH_ADMIN_USER_IDS?.trim()
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Canonical origin for passkey RP and static URLs (not per-request). */
function canonicalAuthBaseUrlString(): string {
  return (
    process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") ||
    getSiteUrl().replace(/\/$/, "")
  )
}

function resolveAuthBaseURL():
  | string
  | {
      allowedHosts: string[]
      protocol: "http" | "https"
      /** When `Host` is not in `allowedHosts` (e.g. apex vs www), use this origin instead of 500. */
      fallback: string
    } {
  if (isProductionBuild) {
    return (
      process.env.BETTER_AUTH_URL?.trim().replace(/\/$/, "") ??
      "http://localhost:3000"
    )
  }
  const hosts = betterAuthAllowedHostsFromEnv()
  if (hosts.length === 0) {
    return canonicalAuthBaseUrlString()
  }
  return {
    allowedHosts: hosts,
    protocol: process.env.NODE_ENV === "development" ? "http" : "https",
    fallback: canonicalAuthBaseUrlString(),
  }
}

function passkeyOrigin(): string {
  return canonicalAuthBaseUrlString()
}

function passkeyRpId(): string {
  const explicit = process.env.PASSKEY_RP_ID?.trim()
  if (explicit) return explicit
  try {
    return new URL(`${canonicalAuthBaseUrlString()}/`).hostname
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

/**
 * Better Auth Infrastructure connection (`dash()` Dashboard plugin + optional `sentinel()`).
 * @see https://better-auth.com/docs/infrastructure/plugins/dashboard
 * @see https://better-auth.com/docs/infrastructure/plugins/dash#dashoptions
 * @see https://better-auth.com/docs/infrastructure/plugins/sentinel#sentineloptions
 */
function betterAuthInfraConnection(): {
  apiKey: string
  apiUrl?: string
  kvUrl?: string
} | null {
  const apiKey = process.env.BETTER_AUTH_API_KEY?.trim()
  if (!apiKey) return null
  const apiUrl = process.env.BETTER_AUTH_API_URL?.trim()
  const kvUrl = process.env.BETTER_AUTH_KV_URL?.trim()
  return {
    apiKey,
    ...(apiUrl ? { apiUrl } : {}),
    ...(kvUrl ? { kvUrl } : {}),
  }
}

function parsePositiveIntEnv(raw: string | undefined, fallback: number): number {
  const s = raw?.trim()
  if (!s || !/^\d+$/.test(s)) return fallback
  const n = Number.parseInt(s, 10)
  return n > 0 ? n : fallback
}

/**
 * Options for `dash()` — `apiKey` / optional `apiUrl` / `kvUrl`, plus optional activity tracking.
 * @see https://better-auth.com/docs/infrastructure/plugins/dashboard#activity-tracking
 * Enable with `BETTER_AUTH_INFRA_ACTIVITY_TRACKING=1` after `user.lastActiveAt` migration (0007).
 */
function betterAuthDashPluginOptions():
  | Parameters<typeof dash>[0]
  | null {
  const conn = betterAuthInfraConnection()
  if (!conn) return null

  const activityEnabled =
    process.env.BETTER_AUTH_INFRA_ACTIVITY_TRACKING === "1"
  const updateInterval = parsePositiveIntEnv(
    process.env.BETTER_AUTH_INFRA_ACTIVITY_INTERVAL_MS,
    300_000
  )

  return {
    ...conn,
    ...(activityEnabled
      ? {
          activityTracking: {
            enabled: true,
            updateInterval,
          },
        }
      : {}),
  }
}

function betterAuthInfraServerPlugins(): BetterAuthPlugin[] {
  const dashOpts = betterAuthDashPluginOptions()
  if (!dashOpts) return []

  const plugins: BetterAuthPlugin[] = [dash(dashOpts) as BetterAuthPlugin]
  const conn = betterAuthInfraConnection()
  if (conn && process.env.BETTER_AUTH_INFRA_SENTINEL === "1") {
    plugins.push(sentinel(conn) as BetterAuthPlugin)
  }
  return plugins
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    camelCase: true,
  }),
  trustedOrigins: betterAuthTrustedOriginsFromEnv(),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    (isProductionBuild
      ? "build-phase-placeholder-secret-min-32-chars!!"
      : undefined),
  baseURL: resolveAuthBaseURL(),
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: AUTH_SESSION_FRESH_AGE_SECONDS,
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
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: Object.keys(socialProviders()),
      allowDifferentEmails: false,
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        sendAuthEmail({
          to: user.email,
          subject: `${mailCtx.siteName} — confirm email change`,
          text: `Approve changing your login email to ${newEmail}: ${url}`,
          html: `<p>Approve changing your login email to <strong>${newEmail}</strong>:</p><p><a href="${url}">Confirm change</a></p>`,
        })
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-out") {
        try {
          const token = await ctx.getSignedCookie(
            ctx.context.authCookies.sessionToken.name,
            ctx.context.secret
          )
          if (token) {
            const found = await ctx.context.internalAdapter.findSession(token)
            if (found) {
              void writeIamAuditEventFromHeaders(ctx.headers, {
                action: "iam.session.sign_out",
                actorUserId: found.user.id,
                actorSessionId: found.session.id,
                organizationId: found.session.activeOrganizationId ?? null,
                path: ctx.path,
              })
            }
          }
        } catch {
          /* best-effort audit */
        }
      }

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
            gt(schema.invitation.expiresAt, new Date())
          )
        )
        .limit(1)

      if (!invite) {
        throw new APIError("FORBIDDEN", {
          message: "Invite required to create an account.",
        })
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const ns = ctx.context.newSession as
        | {
            user: { id: string }
            session: {
              id: string
              activeOrganizationId?: string | null
            }
          }
        | undefined
      if (!ns?.user?.id || !ns?.session?.id) return

      const path = ctx.path
      const resolved = resolveIamSessionLifecycleAudit(path)
      if (!resolved) return

      void writeIamAuditEventFromHeaders(ctx.headers, {
        action: resolved.action,
        actorUserId: ns.user.id,
        actorSessionId: ns.session.id,
        organizationId: ns.session.activeOrganizationId ?? null,
        path,
        metadata: {
          method: resolved.method,
        },
      })
    }),
  },
  plugins: [
    ...betterAuthInfraServerPlugins(),
    organization({
      requireEmailVerificationOnInvitation:
        process.env.BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION_ON_INVITATION ===
        "1",
      sendInvitationEmail: async (data) => {
        const { siteUrl, siteName } = authMailContext()
        const base = siteUrl.replace(/\/$/, "")
        const invitePath = `${toLocalePath(DEFAULT_APP_LOCALE, "/accept-invitation")}?invitationId=${encodeURIComponent(data.id)}`
        const inviteLink = `${base}${invitePath}`
        const orgName = data.organization.name
        sendAuthEmail({
          to: data.email,
          subject: `${siteName} — invited to ${orgName}`,
          text: [
            `You've been invited to join ${orgName} on ${siteName}.`,
            "",
            `Accept (sign in if prompted): ${inviteLink}`,
          ].join("\n"),
          html: `<p>You've been invited to join <strong>${orgName}</strong> on ${siteName}.</p><p><a href="${inviteLink}">Accept invitation</a></p>`,
        })
      },
    }),
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
