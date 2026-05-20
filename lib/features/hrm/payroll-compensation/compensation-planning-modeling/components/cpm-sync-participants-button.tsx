"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

import { Button } from "#components2/ui/button"

import { syncCompensationCycleParticipantsAction } from "#features/hrm/client"

export function CpmSyncParticipantsButton({ cycleId }: { cycleId: string }) {
  const t = useTranslations("Dashboard.Hrm.compensationPlanning")
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMessage(null)
          startTransition(async () => {
            const result =
              await syncCompensationCycleParticipantsAction(cycleId)
            if (!result.ok) {
              setMessage(result.error)
              return
            }
            setMessage(
              t("syncParticipantsSuccess", { count: result.processed })
            )
          })
        }}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("syncParticipantsSubmitting")}
          </>
        ) : (
          t("syncParticipantsOpen")
        )}
      </Button>
      {message ? (
        <p className="text-xs text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
