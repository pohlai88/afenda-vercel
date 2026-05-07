import { describe, expect, it, vi } from "vitest"

vi.mock("next-intl/server", () => ({
  getTranslations: async ({
    namespace,
  }: {
    locale: string
    namespace: string
  }) => {
    const { default: messages } = await import("../../messages/en.json")
    const ns = messages[namespace as keyof typeof messages] as unknown
    const getNested = (obj: unknown, path: string): string => {
      const parts = path.split(".")
      let cur: unknown = obj
      for (const p of parts) {
        if (cur && typeof cur === "object" && p in (cur as object)) {
          cur = (cur as Record<string, unknown>)[p]
        } else {
          return path
        }
      }
      return typeof cur === "string" ? cur : path
    }
    return (
      key: string,
      values?: Record<string, string | number | Date>
    ): string => {
      let out = getNested(ns, key)
      if (values) {
        for (const [k, val] of Object.entries(values)) {
          out = out.replaceAll(`{${k}}`, String(val))
        }
      }
      return out
    }
  },
}))

import {
  resolveAuthInterruptionMetaTitle,
  resolveAuthStatusContent,
} from "../../lib/auth/auth-status-copy"
import { authInterruptionHref } from "../../lib/auth/auth-interruption-url.shared"
import {
  AUTH_STATUS,
  parseAuthStatusParam,
  pickFirstParam,
  sanitizeAuthContext,
} from "../../lib/auth/auth-status.shared"
import { DEFAULT_APP_LOCALE, toLocalePath } from "../../lib/i18n/locales.shared"

const en = DEFAULT_APP_LOCALE

describe("auth-status.shared", () => {
  it("parses known authStatus values", () => {
    expect(parseAuthStatusParam("session_expired")).toBe(
      AUTH_STATUS.SESSION_EXPIRED
    )
    expect(parseAuthStatusParam(["step_up_required"])).toBe(
      AUTH_STATUS.STEP_UP_REQUIRED
    )
  })

  it("rejects unknown values", () => {
    expect(parseAuthStatusParam("expired")).toBeNull()
    expect(parseAuthStatusParam("")).toBeNull()
    expect(parseAuthStatusParam(undefined)).toBeNull()
  })

  it("sanitizes context", () => {
    expect(sanitizeAuthContext("  AP-2044  ")).toBe("AP-2044")
    expect(sanitizeAuthContext("line\nbreak")).toBe("line break")
    expect(sanitizeAuthContext("<script>")).toBe("script")
    expect(sanitizeAuthContext(undefined)).toBeUndefined()
    expect(sanitizeAuthContext(["  AP-2  "])).toBe("AP-2")
    expect(sanitizeAuthContext("<>")).toBeUndefined()
    expect(sanitizeAuthContext("x", 0)).toBeUndefined()
    expect(sanitizeAuthContext([])).toBeUndefined()
  })

  it("pickFirstParam returns first string or undefined", () => {
    expect(pickFirstParam("x")).toBe("x")
    expect(pickFirstParam(["  y  "])).toBe("  y  ")
    expect(pickFirstParam("")).toBeUndefined()
    expect(pickFirstParam(["", "z"])).toBeUndefined()
    expect(pickFirstParam(undefined)).toBeUndefined()
  })
})

describe("auth-interruption-url.shared", () => {
  it("builds session-expired href with canonical query keys", () => {
    const href = authInterruptionHref(AUTH_STATUS.SESSION_EXPIRED, {
      locale: en,
      callbackPath: toLocalePath(en, "/dashboard/contacts"),
      context: "AP-1",
    })
    expect(href.startsWith(toLocalePath(en, "/session-expired") + "?")).toBe(
      true
    )
    expect(href).toContain("authStatus=session_expired")
    expect(href).toContain(
      `callbackUrl=${encodeURIComponent(toLocalePath(en, "/dashboard/contacts"))}`
    )
    expect(href).toContain(`context=${encodeURIComponent("AP-1")}`)
  })

  it("builds step-up interruption href", () => {
    const href = authInterruptionHref(AUTH_STATUS.STEP_UP_REQUIRED, {
      locale: en,
      callbackPath: toLocalePath(en, "/account/security"),
    })
    expect(href).toContain("authStatus=step_up_required")
    expect(href).toContain(
      `callbackUrl=${encodeURIComponent(toLocalePath(en, "/account/security"))}`
    )
  })

  it("includes optional support ref", () => {
    const href = authInterruptionHref(AUTH_STATUS.SESSION_EXPIRED, {
      locale: en,
      ref: " CASE-1 ",
    })
    expect(href).toContain(`ref=${encodeURIComponent("CASE-1")}`)
  })
})

describe("auth-status-copy", () => {
  it("adds stepUp=1 to sign-in CTA for step_up_required", async () => {
    const content = await resolveAuthStatusContent(
      AUTH_STATUS.STEP_UP_REQUIRED,
      {
        locale: en,
        callbackUrl: toLocalePath(en, "/admin"),
      }
    )
    const stepUpUrl = new URL(content.primaryHref, "https://example.com")
    expect(stepUpUrl.searchParams.get("callbackUrl")).toBe(
      toLocalePath(en, "/admin")
    )
    expect(content.primaryHref).toContain("stepUp=1")
  })

  it("sends email_unverified to account identity settings", async () => {
    const content = await resolveAuthStatusContent(
      AUTH_STATUS.EMAIL_UNVERIFIED,
      {
        locale: en,
        callbackUrl: "/account/security",
      }
    )
    expect(content.primaryHref).toBe(toLocalePath(en, "/account/identity"))
  })
})

describe("resolveAuthInterruptionMetaTitle", () => {
  it("returns document titles from VerifyEmail.meta for known codes", async () => {
    const sessionTitle = await resolveAuthInterruptionMetaTitle(
      en,
      AUTH_STATUS.SESSION_EXPIRED
    )
    expect(sessionTitle.length).toBeGreaterThan(0)

    const inviteTitle = await resolveAuthInterruptionMetaTitle(
      en,
      AUTH_STATUS.INVITATION_EXPIRED
    )
    expect(inviteTitle.length).toBeGreaterThan(0)
    expect(inviteTitle).not.toEqual(sessionTitle)
  })
})
