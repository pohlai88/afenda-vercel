"use client"

import { useEffect, useRef } from "react"

/**
 * Fires `onSuccess` once each time a Server Action `FormState` transitions
 * to `{ ok: true }`. Centralizes the repeated `useRef + useEffect` shape
 * that every HRM dialog form previously inlined to keep the parent
 * dialog's close callback latest without resubscribing the success
 * effect on every render.
 *
 * The internal `useRef` keeps the latest `onSuccess` reference (parents
 * frequently recreate the callback each render) so the action-result
 * effect's dependency stays `[state]` — firing exactly once per
 * `ok` transition rather than per-render.
 *
 * Lives under `_internal-cross-cutting` so it stays a private HRM
 * detail; do not re-export from `#features/hrm` / `#features/hrm/client`.
 * Forms import via a same-module relative path
 * (e.g. `../../../_internal-cross-cutting/use-form-success.client`).
 *
 * If the caller needs to fire only on a richer condition than `ok`
 * (e.g. `state.outcome === "approved"` or `router.refresh()` after
 * success), keep the inline effect — that signal is not the
 * "after a successful mutation, close the dialog" shape this hook
 * encapsulates.
 */
export function useFormSuccess<
  TState extends { ok: boolean } | null | undefined,
>(state: TState, onSuccess: (() => void) | undefined): void {
  const onSuccessRef = useRef(onSuccess)

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    if (state?.ok) {
      onSuccessRef.current?.()
    }
  }, [state])
}
