"use client"

import { useSyncExternalStore } from "react"
import type { Route } from "next"

import { Button } from "#components2/ui/button"
import { Link } from "#i18n/navigation"
import { ui } from "#lib/design-system"
import { cn } from "#lib/utils"

const COOKIE_CONSENT_STORAGE_KEY = "afenda:cookie-consent-choice"

type CookieConsentChoice = "accepted" | "rejected"

type CookieConsentPreviewProps = {
  readonly eyebrow: string
  readonly title: string
  readonly description: string
  readonly acceptLabel: string
  readonly rejectLabel: string
  readonly manageLabel: string
}

const sameTabListeners = new Set<() => void>()

function emitCookieConsentChoiceChanged() {
  for (const listener of sameTabListeners) {
    listener()
  }
}

function subscribe(onStoreChange: () => void) {
  sameTabListeners.add(onStoreChange)
  if (typeof window === "undefined") {
    return () => {
      sameTabListeners.delete(onStoreChange)
    }
  }
  const onStorage = (event: StorageEvent) => {
    if (event.key === COOKIE_CONSENT_STORAGE_KEY || event.key === null) {
      onStoreChange()
    }
  }
  window.addEventListener("storage", onStorage)
  return () => {
    sameTabListeners.delete(onStoreChange)
    window.removeEventListener("storage", onStorage)
  }
}

function readStoredCookieConsentChoice(): CookieConsentChoice | null {
  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)

    if (stored === "accepted" || stored === "rejected") {
      return stored
    }
  } catch {
    // Keep consent UI usable when storage is unavailable.
  }

  return null
}

function getSnapshot(): CookieConsentChoice | null {
  return readStoredCookieConsentChoice()
}

function getServerSnapshot(): CookieConsentChoice | null {
  // Must match SSR output: localStorage is unavailable on the server, so we
  // always render the banner until the client re-reads after hydration.
  return null
}

export function CookieConsentPreview({
  eyebrow,
  title,
  description,
  acceptLabel,
  rejectLabel,
  manageLabel,
}: CookieConsentPreviewProps) {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  function persistChoice(nextChoice: CookieConsentChoice) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, nextChoice)
    } catch {
      // Keep consent UI usable when storage is unavailable.
    }
    emitCookieConsentChoiceChanged()
  }

  if (choice !== null) {
    return null
  }

  return (
    <section
      aria-label={title}
      className={cn(
        "fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl border border-border bg-card/96 text-card-foreground backdrop-blur-xl sm:inset-x-6 sm:bottom-6",
        ui.radius.card,
        ui.elevation.floating,
        ui.padding.card
      )}
    >
      <div className="grid gap-surface-md">
        <div className="grid gap-2">
          <p className="m-0 text-[0.68rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            {eyebrow}
          </p>

          <h2 className="m-0 text-base leading-tight font-semibold tracking-[-0.015em] text-foreground">
            {title}
          </h2>

          <p className="m-0 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-surface-md sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => persistChoice("rejected")}
          >
            {rejectLabel}
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link href={"/legal-docs/cookies" as Route}>{manageLabel}</Link>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => persistChoice("accepted")}
          >
            {acceptLabel}
          </Button>
        </div>
      </div>
    </section>
  )
}
