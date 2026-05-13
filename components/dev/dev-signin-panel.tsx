"use client"

import type { Route } from "next"
import { ChevronDown, ChevronUp, Code2, Loader2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useLocale } from "next-intl"
import { useCallback, useLayoutEffect, useRef, useState } from "react"

import { useDevSignInPanelDrag } from "./dev-signin-panel-drag"

import { neonAuthClient } from "#lib/auth-client-neon-compat"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import {
  uiRadius,
  uiStatusToneClasses,
  uiSurfaceElevation,
  type UiStatusTone,
} from "#lib/design-system"
import {
  ensureAppLocale,
  stripLeadingLocalePrefix,
  toLocalePath,
  type AppLocale,
} from "#lib/i18n/locales.shared"
import { cn } from "#lib/utils"

/**
 * Must match `DEMO_ORG` in `scripts/seed-dev-users.mjs` and
 * `tests/fixtures/bootstrap-mocks.ts` (BOOTSTRAP_FIXTURE.organization).
 */
const DEMO_ORG_ID = "00000000-0000-4000-8000-000000000001"
const DEMO_ORG_SLUG = "demo-org"

/**
 * Must match `DEV_PASSWORD` in `scripts/seed-dev-users.mjs`.
 * Change both together when rotating dev credentials.
 */
const DEV_PASSWORD = "123qweasdzxc!@#"

/**
 * Resolves the post-auth route: safe `callbackUrl` (locale-stripped) or the demo
 * org dashboard (full tenant bootstrap: session + active org + known slug).
 */
function resolveDevPostAuthRoute(callbackParam: string | null): Route {
  const fallback = organizationDashboardPath(DEMO_ORG_SLUG, "home")
  const raw = callbackParam?.trim()
  if (!raw || raw.length > 2048) {
    return fallback
  }

  const qIndex = raw.indexOf("?")
  const pathOnly = qIndex >= 0 ? raw.slice(0, qIndex) : raw
  const query = qIndex >= 0 ? raw.slice(qIndex) : ""

  const stripped = stripLeadingLocalePrefix(pathOnly)
  const internal = stripped ? stripped.pathnameWithoutLocale : pathOnly
  if (!internal.startsWith("/")) {
    return fallback
  }

  return `${internal}${query}` as Route
}

/** Same shape as server-validated `callbackUrl` / {@link SignInForm} — locale-prefixed absolute path on origin. */
function localePrefixedAuthCallback(
  locale: AppLocale,
  localeInternalDestination: Route
): string {
  const raw = localeInternalDestination.trim()
  const qIdx = raw.indexOf("?")
  const pathOnly = (qIdx >= 0 ? raw.slice(0, qIdx) : raw) as `/${string}`
  const query = qIdx >= 0 ? raw.slice(qIdx) : ""
  return `${toLocalePath(locale, pathOnly)}${query}`
}

/**
 * Preset accounts for local UX only — align with `tests/fixtures/bootstrap-mocks.ts`
 * when you use demo org bootstrap; edit freely for your machine.
 */
const DEV_SIGNIN_PRESETS: ReadonlyArray<{
  label: string
  email: string
  role: string
  tone: UiStatusTone
  description: string
}> = [
  {
    label: "Owner",
    email: "owner@afenda.com",
    role: "Owner",
    tone: "info",
    description: "Org owner — full tenant admin paths.",
  },
  {
    label: "ERP",
    email: "erp@afenda.com",
    role: "Member",
    tone: "neutral",
    description: "Standard ERP member — default dashboard access.",
  },
]

const shell =
  "max-w-xs backdrop-blur-sm border bg-card text-card-foreground " +
  `${uiRadius.control} ${uiSurfaceElevation.raised} border-border`

export function DevSignInPanel() {
  const [collapsed, setCollapsed] = useState(false)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const locale = ensureAppLocale(useLocale())
  const panelRef = useRef<HTMLDivElement>(null)
  const expandPanel = useCallback(() => setCollapsed(false), [])
  const {
    panelPosition,
    isDraggingPanel,
    dragPointerDown,
    dragClick,
    clampPanelToViewport,
  } = useDevSignInPanelDrag(panelRef, collapsed ? expandPanel : undefined)

  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => {
      clampPanelToViewport()
    })
    return () => cancelAnimationFrame(id)
  }, [collapsed, clampPanelToViewport])

  async function signInAs(email: string) {
    if (pending) return
    setError(null)
    setPending(email)

    const destination = resolveDevPostAuthRoute(searchParams.get("callbackUrl"))
    const callbackURL = localePrefixedAuthCallback(locale, destination)

    try {
      const { error: err } = await neonAuthClient.signIn.email({
        email,
        password: DEV_PASSWORD,
        callbackURL,
      })
      if (err) {
        setError(err.message ?? "Sign-in failed — check dev:seed ran.")
        return
      }

      const setActive = neonAuthClient.organization?.setActive
      if (typeof setActive !== "function") {
        setError(
          "Neon Auth client has no organization.setActive — cannot attach demo org."
        )
        return
      }

      const { error: orgErr } = await setActive({
        organizationId: DEMO_ORG_ID,
      })
      if (orgErr) {
        setError(
          orgErr.message ??
            "Could not activate demo organization — run pnpm dev:seed."
        )
        return
      }

      // Full navigation so the next document request includes auth cookies (avoids a
      // soft navigation where RSC sometimes runs before the session is readable).
      window.location.assign(callbackURL)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed.")
    } finally {
      setPending(null)
    }
  }

  const panelMotion = isDraggingPanel
    ? "motion-safe:transition-none motion-reduce:transition-none"
    : "motion-safe:transition-[left,bottom] motion-safe:duration-150 motion-reduce:transition-none"

  if (collapsed) {
    return (
      <div
        ref={panelRef}
        style={{
          left: panelPosition.left,
          bottom: panelPosition.bottom,
        }}
        className={cn("fixed z-50 w-max", panelMotion)}
      >
        <button
          type="button"
          onPointerDown={dragPointerDown}
          onClick={dragClick}
          onDragStart={(e) => {
            e.preventDefault()
          }}
          className={cn(
            "touch-none select-none",
            shell,
            "inline-flex items-center gap-2 px-surface-md py-surface-sm text-sm font-medium transition-colors hover:bg-accent",
            isDraggingPanel
              ? "cursor-grabbing"
              : "cursor-grab focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          )}
          aria-label="Open development sign-in shortcuts (drag to move)"
        >
          <Code2 className="size-4 shrink-0 text-warning" aria-hidden />
          <span>Dev sign-in</span>
          <ChevronUp
            className="size-4 shrink-0 rotate-180 text-muted-foreground"
            aria-hidden
          />
        </button>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      style={{
        left: panelPosition.left,
        bottom: panelPosition.bottom,
      }}
      className={cn("fixed z-50 w-max", panelMotion)}
    >
      <div className={cn(shell, "p-surface-md")}>
        <div className="mb-surface-sm flex items-center justify-between gap-2">
          <div
            className={cn(
              "flex min-w-0 flex-1 touch-none items-center gap-2 select-none",
              isDraggingPanel ? "cursor-grabbing" : "cursor-grab"
            )}
            onPointerDown={dragPointerDown}
            onClick={dragClick}
            onDragStart={(e) => {
              e.preventDefault()
            }}
            role="group"
            aria-label="Drag to move development shortcuts"
          >
            <Code2 className="size-4 shrink-0 text-warning" aria-hidden />
            <p className="text-sm font-semibold text-card-foreground">
              Development
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className={cn(
              "shrink-0 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              uiRadius.control
            )}
            aria-label="Minimize development sign-in shortcuts"
          >
            <ChevronDown className="size-4" aria-hidden />
          </button>
        </div>
        <p className="mb-surface-sm text-xs text-muted-foreground">
          One-click sign-in: activates demo org + lands on dashboard (local
          only). Drag the title bar to move this panel.
        </p>
        <ul className="flex flex-col gap-2">
          {DEV_SIGNIN_PRESETS.map((preset) => {
            const busy = pending === preset.email
            return (
              <li key={preset.email} className="text-xs">
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => void signInAs(preset.email)}
                  className={cn(
                    "-mx-2 w-[calc(100%+1rem)] border border-transparent p-surface-sm text-left transition-colors",
                    "hover:border-border hover:bg-accent disabled:pointer-events-none disabled:opacity-60",
                    uiRadius.control
                  )}
                  aria-label={`Sign in as ${preset.label} (${preset.email})`}
                  aria-busy={busy}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "shrink-0 px-1.5 py-0.5 text-[0.625rem] font-medium",
                        uiRadius.chip,
                        uiStatusToneClasses[preset.tone]
                      )}
                    >
                      {preset.role}
                    </span>
                    <span className="truncate font-medium text-card-foreground">
                      {preset.label}
                    </span>
                    {busy ? (
                      <Loader2
                        className="ml-auto size-3 shrink-0 animate-spin text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                  <p className="mt-0.5 pl-12 text-muted-foreground">
                    {preset.description}
                  </p>
                  <code className="mt-0.5 block truncate pl-12 font-mono text-[0.625rem] text-muted-foreground">
                    {preset.email}
                  </code>
                </button>
              </li>
            )
          })}
        </ul>
        {error ? (
          <p
            role="alert"
            className="mt-surface-sm text-[0.625rem] leading-snug text-destructive"
          >
            {error}
          </p>
        ) : null}
        <p className="mt-surface-md border-t border-border pt-surface-sm text-[0.625rem] leading-snug text-muted-foreground">
          First-time setup: run{" "}
          <code className="rounded bg-muted px-1 py-px font-mono">
            pnpm env:sync && pnpm dev:seed
          </code>{" "}
          to create accounts, org{" "}
          <code className="font-mono text-[0.625rem]">{DEMO_ORG_SLUG}</code>,
          and memberships in{" "}
          <code className="font-mono text-[0.625rem]">neon_auth</code>.
        </p>
      </div>
    </div>
  )
}
