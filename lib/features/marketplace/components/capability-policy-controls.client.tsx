"use client"

import type { ReactNode } from "react"
import { useState, useTransition } from "react"

import { Loader2, Pin, RotateCcw, ShieldCheck, ShieldOff } from "lucide-react"

import { Button } from "#components/ui/button"

import {
  deleteOrgCapabilityPolicyAction,
  setOrgCapabilityPolicyAction,
} from "../client"
import type { PolicyAudience, PolicyState } from "../client"

export type CapabilityPolicyControlLabels = {
  group: string
  allow: string
  block: string
  mandate: string
  reset: string
  pending: string
  error: string
}

export type CapabilityPolicyControlsProps = {
  capabilityId: string
  policyState: PolicyState | null
  audience?: PolicyAudience
  labels: CapabilityPolicyControlLabels
}

/**
 * Admin org-policy controls for one capability. This is deliberately
 * separate from the personal preference toggle so governance writes
 * cannot accidentally mutate only the current admin's utility bar.
 */
export function CapabilityPolicyControls({
  capabilityId,
  policyState,
  audience = "all",
  labels,
}: CapabilityPolicyControlsProps) {
  const [optimistic, setOptimistic] = useState<PolicyState | null>(policyState)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const active = optimistic

  const setPolicy = (state: PolicyState) => {
    setError(null)
    setOptimistic(state)
    startTransition(async () => {
      const result = await setOrgCapabilityPolicyAction({
        capabilityId,
        state,
        audience,
      })
      if (!result.ok) {
        setOptimistic(policyState)
        setError(result.message ?? labels.error)
      }
    })
  }

  const resetPolicy = () => {
    setError(null)
    setOptimistic(null)
    startTransition(async () => {
      const result = await deleteOrgCapabilityPolicyAction({
        capabilityId,
        audience,
      })
      if (!result.ok) {
        setOptimistic(policyState)
        setError(result.message ?? labels.error)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div
        role="group"
        aria-label={labels.group}
        className="grid w-full grid-cols-2 gap-1 sm:flex sm:w-auto sm:flex-wrap sm:justify-end"
      >
        <PolicyButton
          label={labels.allow}
          icon={<ShieldCheck className="size-3.5" aria-hidden />}
          active={active === "allowed"}
          pending={pending}
          onClick={() => setPolicy("allowed")}
        />
        <PolicyButton
          label={labels.block}
          icon={<ShieldOff className="size-3.5" aria-hidden />}
          active={active === "blocked"}
          pending={pending}
          onClick={() => setPolicy("blocked")}
        />
        <PolicyButton
          label={labels.mandate}
          icon={<Pin className="size-3.5" aria-hidden />}
          active={active === "mandatory"}
          pending={pending}
          onClick={() => setPolicy("mandatory")}
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending || active === null}
          onClick={resetPolicy}
          className="justify-center"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RotateCcw className="size-3.5" aria-hidden />
          )}
          <span>{pending ? labels.pending : labels.reset}</span>
        </Button>
      </div>
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

function PolicyButton({
  label,
  icon,
  active,
  pending,
  onClick,
}: {
  label: string
  icon: ReactNode
  active: boolean
  pending: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      aria-pressed={active}
      disabled={pending}
      onClick={onClick}
      className="justify-center"
    >
      {icon}
      {label}
    </Button>
  )
}
