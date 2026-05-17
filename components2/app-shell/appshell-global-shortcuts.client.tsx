"use client"

import { useEffect, useRef } from "react"

import { useRouter } from "#i18n/navigation"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"

import { useAppShellStore } from "../stores/app-shell.store"

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

type AppShellGlobalShortcutsProps = {
  orgSlug: string
}

export function AppShellGlobalShortcuts({ orgSlug }: AppShellGlobalShortcutsProps) {
  const router = useRouter()
  const commandOpen = useAppShellStore((s) => s.commandOpen)
  const openCommand = useAppShellStore((s) => s.openCommand)
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
      if (commandOpen) return
      if (isTypingTarget(e.target)) return

      const key = e.key.toLowerCase()

      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault()
        openCommand()
        return
      }

      if (key === "g") {
        gChordDeadline.current = Date.now() + 900
        return
      }

      if (withinGChord() && key === "h") {
        e.preventDefault()
        clearGChord()
        router.push(organizationDashboardPath(orgSlug, "home"))
        return
      }

      if (withinGChord()) clearGChord()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [commandOpen, openCommand, orgSlug, router])

  return null
}
