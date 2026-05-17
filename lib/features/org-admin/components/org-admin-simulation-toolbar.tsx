"use client"

import { useState } from "react"

import { useTranslations } from "next-intl"

import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import { Input } from "#components2/ui/input"
import { Spinner } from "#components2/ui/spinner"
import {
  OPERATIONAL_SIMULATION_SCENARIO_VENDOR_PAYMENT_BLOCKED_CERT_EXPIRY,
  clearOrgOperationalSimulationRunAction,
  replayOrgOperationalScenarioAction,
} from "#features/simulation/client"

export function OrgAdminSimulationToolbar() {
  const t = useTranslations("OrgAdmin.audit.simulation")
  const [replayPending, setReplayPending] = useState(false)
  const [clearPending, setClearPending] = useState(false)
  const [runIdInput, setRunIdInput] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onReplay() {
    setError(null)
    setMessage(null)
    setReplayPending(true)
    try {
      const result = await replayOrgOperationalScenarioAction(
        OPERATIONAL_SIMULATION_SCENARIO_VENDOR_PAYMENT_BLOCKED_CERT_EXPIRY
      )
      if (result.ok) {
        setRunIdInput(result.simulationRunId)
        setMessage(
          t("replayOk", {
            runId: result.simulationRunId,
          })
        )
      } else {
        setError(result.error)
      }
    } finally {
      setReplayPending(false)
    }
  }

  async function onClear() {
    setError(null)
    setMessage(null)
    const id = runIdInput.trim()
    if (id.length < 8) {
      setError(t("clearInvalid"))
      return
    }
    setClearPending(true)
    try {
      const result = await clearOrgOperationalSimulationRunAction(id)
      if (result.ok) {
        setMessage(
          t("clearOk", {
            audit: result.deletedAudit,
          })
        )
      } else {
        setError(result.error)
      }
    } finally {
      setClearPending(false)
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded-md border border-dashed border-border bg-muted/20 p-3 text-left">
      <p className="text-xs font-medium text-muted-foreground">{t("title")}</p>
      <p className="text-xs text-muted-foreground">{t("description")}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={replayPending}
          onClick={() => void onReplay()}
        >
          {replayPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-3.5" />
              {t("replayPending")}
            </span>
          ) : (
            t("replayButton")
          )}
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor="sim-run-id" className="text-xs text-muted-foreground">
            {t("runIdLabel")}
          </label>
          <Input
            id="sim-run-id"
            value={runIdInput}
            onChange={(e) => setRunIdInput(e.target.value)}
            placeholder={t("runIdPlaceholder")}
            className="font-mono text-xs"
            autoComplete="off"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={clearPending}
          onClick={() => void onClear()}
        >
          {clearPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-3.5" />
              {t("clearPending")}
            </span>
          ) : (
            t("clearButton")
          )}
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{t("errorTitle")}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {message && !error ? (
        <Alert>
          <AlertTitle>{t("okTitle")}</AlertTitle>
          <AlertDescription className="break-all whitespace-pre-wrap">
            {message}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
