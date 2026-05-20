"use client"

import { useEffect, useRef } from "react"

type UseFormSuccessOptions<TState> = {
  /** Extra predicate beyond `state.ok` — e.g. `state.outcome === "approved"`. */
  when?: (state: NonNullable<TState>) => boolean
  /** Runs after `onSuccess` when the success transition fires. */
  afterSuccess?: () => void
}

/**
 * Fires `onSuccess` once each time a Server Action `FormState` transitions
 * to a successful result. Centralizes the repeated `useRef + useEffect` shape
 * that every HRM dialog form previously inlined to keep the parent
 * dialog's close callback latest without resubscribing the success
 * effect on every render.
 *
 * Pass `options.when` when success requires more than `{ ok: true }` (e.g.
 * remote check-in only closes the dialog on `outcome === "approved"`).
 * Pass `options.afterSuccess` for follow-up work such as `router.refresh()`.
 */
export function useFormSuccess<
  TState extends { ok: boolean } | null | undefined,
>(
  state: TState,
  onSuccess: (() => void) | undefined,
  options?: UseFormSuccessOptions<TState>
): void {
  const onSuccessRef = useRef(onSuccess)
  const whenRef = useRef(options?.when)
  const afterSuccessRef = useRef(options?.afterSuccess)

  useEffect(() => {
    onSuccessRef.current = onSuccess
  }, [onSuccess])

  useEffect(() => {
    whenRef.current = options?.when
  }, [options?.when])

  useEffect(() => {
    afterSuccessRef.current = options?.afterSuccess
  }, [options?.afterSuccess])

  useEffect(() => {
    if (!state?.ok) return
    if (whenRef.current && !whenRef.current(state)) return
    onSuccessRef.current?.()
    afterSuccessRef.current?.()
  }, [state])
}
