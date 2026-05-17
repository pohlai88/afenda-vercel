"use client"

import { useState, useTransition } from "react"

import { CheckCircle2, Eye, EyeOff, Loader2, XCircle } from "lucide-react"

import { Button } from "#components2/ui/button"

import { setUserCapabilityPreferenceAction } from "../client"
import type { PreferenceState, ResolvedEffectiveState } from "../client"

export type CapabilityToggleButtonProps = {
  capabilityId: string
  /** Current effective state from the resolver. */
  effective: ResolvedEffectiveState
  /** Whether the underlying definition is `customizable`. */
  customizable: boolean
  /** Localized labels — mandatory copy stays out of this leaf. */
  labels: {
    enable: string
    disable: string
    pending: string
    mandatory: string
    blocked: string
    unavailable: string
    notCustomizable: string
    error: string
  }
}

/**
 * Toggle button that flips a single capability's user preference.
 *
 * The Server Action infers the next state from the *current effective*
 * state — flipping a `visible` capability writes `hidden`, flipping a
 * `hidden` capability writes `visible`. Mandatory and blocked rows are
 * read-only by contract (the org policy outranks the user preference).
 */
export function CapabilityToggleButton({
  capabilityId,
  effective,
  customizable,
  labels,
}: CapabilityToggleButtonProps) {
  const [optimistic, setOptimistic] = useState<PreferenceState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (effective === "mandatory") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        className="w-full justify-center sm:w-auto"
      >
        <CheckCircle2 className="size-3.5" aria-hidden />
        {labels.mandatory}
      </Button>
    )
  }
  if (effective === "unavailable") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        className="w-full justify-center sm:w-auto"
      >
        <XCircle className="size-3.5" aria-hidden />
        {labels.unavailable}
      </Button>
    )
  }
  if (!customizable) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled
        className="w-full justify-center sm:w-auto"
      >
        {labels.notCustomizable}
      </Button>
    )
  }

  const currentVisible =
    optimistic === null ? effective === "visible" : optimistic === "visible"
  const nextState: PreferenceState = currentVisible ? "hidden" : "visible"
  const idleLabel = currentVisible ? labels.disable : labels.enable

  const flip = () => {
    setError(null)
    setOptimistic(nextState)
    startTransition(async () => {
      const result = await setUserCapabilityPreferenceAction({
        capabilityId,
        state: nextState,
      })
      if (!result.ok) {
        setOptimistic(null)
        setError(result.message ?? labels.error)
      }
    })
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
      <Button
        type="button"
        size="sm"
        variant={currentVisible ? "outline" : "default"}
        onClick={flip}
        disabled={pending}
        aria-pressed={currentVisible}
        className="justify-center"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : currentVisible ? (
          <EyeOff className="size-3.5" aria-hidden />
        ) : (
          <Eye className="size-3.5" aria-hidden />
        )}
        <span>{pending ? labels.pending : idleLabel}</span>
      </Button>
      {error ? (
        <p
          className="text-[10px] text-destructive"
          role="status"
          aria-live="polite"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
