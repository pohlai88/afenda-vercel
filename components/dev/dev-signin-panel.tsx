"use client"

import { ChevronDown, ChevronUp, Code2 } from "lucide-react"
import { useState } from "react"

import { Link } from "#i18n/navigation"
import {
  uiRadius,
  uiStatusToneClasses,
  uiSurfaceElevation,
  type UiStatusTone,
} from "#lib/design-system"
import { cn } from "#lib/utils"

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
  "fixed bottom-4 left-4 z-50 max-w-xs backdrop-blur-sm border bg-card text-card-foreground " +
  `${uiRadius.control} ${uiSurfaceElevation.raised} border-border`

export function DevSignInPanel() {
  const [collapsed, setCollapsed] = useState(false)

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className={cn(
          shell,
          "inline-flex items-center gap-2 px-surface-md py-surface-sm text-sm font-medium transition-colors hover:bg-accent"
        )}
        aria-label="Open development sign-in shortcuts"
      >
        <Code2 className="size-4 shrink-0 text-warning" aria-hidden />
        <span>Dev sign-in</span>
        <ChevronUp
          className="size-4 shrink-0 rotate-180 text-muted-foreground"
          aria-hidden
        />
      </button>
    )
  }

  return (
    <div className={cn(shell, "p-surface-md")}>
      <div className="mb-surface-sm flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Code2 className="size-4 shrink-0 text-warning" aria-hidden />
          <p className="text-sm font-semibold text-card-foreground">
            Development
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className={cn(
            "rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            uiRadius.control
          )}
          aria-label="Minimize development sign-in shortcuts"
        >
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </div>
      <p className="mb-surface-sm text-xs text-muted-foreground">
        Open sign-in with a prefilled email (local dev only).
      </p>
      <ul className="flex flex-col gap-2">
        {DEV_SIGNIN_PRESETS.map((preset) => (
          <li key={preset.email} className="text-xs">
            <Link
              href={`/sign-in?email=${encodeURIComponent(preset.email)}`}
              className={cn(
                "-mx-2 block border border-transparent p-surface-sm transition-colors hover:border-border hover:bg-accent",
                uiRadius.control
              )}
              aria-label={`Sign in as ${preset.label} (${preset.email})`}
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
              </div>
              <p className="mt-0.5 ml-[3.25rem] text-muted-foreground">
                {preset.description}
              </p>
              <code className="mt-0.5 ml-[3.25rem] block truncate font-mono text-[0.625rem] text-muted-foreground">
                {preset.email}
              </code>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
