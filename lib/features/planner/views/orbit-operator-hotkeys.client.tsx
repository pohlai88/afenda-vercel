"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"

import { useRouter } from "#i18n/navigation"

import type { OrbitKeyboardNavEntry } from "../domain/orbit-keyboard-nav.shared"

function isEditableTarget(target: EventTarget | null) {
  if (!target || !(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  return target.isContentEditable
}

function buildFocusSearch(
  basePath: string,
  current: URLSearchParams,
  kind: string,
  id: string
) {
  const next = new URLSearchParams(current.toString())
  next.set("focusKind", kind)
  next.set("focusId", id)
  next.delete("status")
  const q = next.toString()
  return q.length > 0 ? `${basePath}?${q}` : basePath
}

function clearFocusSearch(basePath: string, current: URLSearchParams) {
  const next = new URLSearchParams(current.toString())
  next.delete("focusKind")
  next.delete("focusId")
  const q = next.toString()
  return q.length > 0 ? `${basePath}?${q}` : basePath
}

export function OrbitOperatorHotkeys({
  basePath,
  listNav,
}: {
  basePath: string
  listNav: readonly OrbitKeyboardNavEntry[]
}) {
  const router = useRouter()
  const t = useTranslations("Dashboard.Orbit.shortcuts")
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return

      const current = new URLSearchParams(window.location.search)
      const focusKind = current.get("focusKind")
      const focusId = current.get("focusId")

      if (event.key === "Escape" && (focusKind || focusId)) {
        event.preventDefault()
        router.replace(clearFocusSearch(basePath, current) as never)
        return
      }

      if (event.key === "/" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault()
        const qInput = document.querySelector<HTMLInputElement>(
          'input[name="q"][aria-label="Orbit search query"]'
        )
        qInput?.focus()
        return
      }

      const isMetaEnter =
        event.key === "Enter" && (event.ctrlKey || event.metaKey)
      if (isMetaEnter) {
        const triageForm = document.querySelector<HTMLFormElement>(
          "form[data-orbit-triage-batch]"
        )
        const queueForm = document.querySelector<HTMLFormElement>(
          "form[data-orbit-queue-batch]"
        )
        const form = triageForm ?? queueForm
        if (form) {
          event.preventDefault()
          form.requestSubmit()
        }
        return
      }

      if (event.key !== "j" && event.key !== "k") return
      if (listNav.length === 0) return

      const idx = listNav.findIndex(
        (row) => row.kind === focusKind && row.id === focusId
      )
      const delta = event.key === "j" ? 1 : -1
      const nextIndex =
        idx === -1
          ? delta > 0
            ? 0
            : listNav.length - 1
          : (idx + delta + listNav.length) % listNav.length
      const row = listNav[nextIndex]
      if (!row) return

      event.preventDefault()
      router.replace(
        buildFocusSearch(basePath, current, row.kind, row.id) as never
      )
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [basePath, listNav, router])

  return (
    <p className="text-xs text-muted-foreground" aria-live="polite">
      {t("hint")}
    </p>
  )
}
