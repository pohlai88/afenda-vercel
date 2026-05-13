"use client"

import { useEffect, useRef } from "react"

import { useRouter } from "#i18n/navigation"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"

import { useWorkbenchCommand } from "./workbench-command"
import { isTypingTarget } from "./workbench-keyboard-utils"

const G_CHORD_MS = 900

type WorkbenchGlobalShortcutsProps = {
  orgSlug: string
}

/**
 * Org-scoped keyboard affordances (navigation chords, quick create, utility focus).
 * Keeps shell chrome keyboard-consistent with {@link WorkbenchUtilityShortcuts}.
 */
export function WorkbenchGlobalShortcuts({
  orgSlug,
}: WorkbenchGlobalShortcutsProps) {
  const router = useRouter()
  const { open, openCommand } = useWorkbenchCommand()
  const gChordDeadline = useRef<number | null>(null)

  useEffect(() => {
    function clearGChord() {
      gChordDeadline.current = null
    }

    function withinGChord(): boolean {
      const d = gChordDeadline.current
      return d != null && Date.now() < d
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat) return
      if (open) return
      if (isTypingTarget(e.target)) return

      if (withinGChord()) {
        if (e.key === "Escape") {
          clearGChord()
          return
        }
        const k = e.key.length === 1 ? e.key.toLowerCase() : ""
        clearGChord()
        const hrefBySecond: Record<
          string,
          ReturnType<typeof organizationDashboardPath>
        > = {
          n: organizationDashboardPath(orgSlug, "home"),
          o: organizationDashboardPath(orgSlug, "orbit"),
          l: organizationDashboardPath(orgSlug, "lynx"),
          c: organizationDashboardPath(orgSlug, "contacts"),
          k: organizationDashboardPath(orgSlug, "knowledge"),
        }
        const href = k ? hrefBySecond[k] : undefined
        if (href) {
          e.preventDefault()
          router.push(href as Parameters<typeof router.push>[0])
        }
        return
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "u"
      ) {
        const bar = document.querySelector<HTMLElement>(
          '[data-workbench-utility-bar="true"]'
        )
        const focusable = bar?.querySelector<HTMLElement>(
          "button:not([disabled]), a[href]"
        )
        if (focusable) {
          e.preventDefault()
          focusable.focus()
        }
        return
      }

      if (
        !(e.metaKey || e.ctrlKey || e.altKey) &&
        e.key.toLowerCase() === "c"
      ) {
        e.preventDefault()
        openCommand()
        return
      }

      if (
        !(e.metaKey || e.ctrlKey || e.altKey) &&
        e.key.length === 1 &&
        e.key.toLowerCase() === "g"
      ) {
        e.preventDefault()
        gChordDeadline.current = Date.now() + G_CHORD_MS
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [orgSlug, open, openCommand, router])

  return null
}
