"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Label } from "#components/ui/label"
import { Textarea } from "#components/ui/textarea"
import {
  FEEDBACK_RESOLUTION_NOTE_MAX,
  type FeedbackStateId,
} from "#features/org-feedback/constants"
import {
  transitionOrgFeedbackAction,
  type TransitionOrgFeedbackState,
} from "#features/org-feedback/client"
import { useRouter } from "#i18n/navigation"

function TransitionSubmitButton({
  label,
  pendingLabel,
  variant = "outline",
}: {
  label: string
  pendingLabel: string
  variant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} variant={variant} size="sm">
      {pending ? pendingLabel : label}
    </Button>
  )
}

export function OrgFeedbackRowActions({
  id,
  state,
}: {
  id: string
  state: FeedbackStateId
}) {
  const t = useTranslations("OrgAdmin.feedback.actions")
  const router = useRouter()
  const [note, setNote] = useState("")

  const [actionState, formAction] = useActionState(
    async (
      prev: TransitionOrgFeedbackState,
      formData: FormData
    ): Promise<TransitionOrgFeedbackState> => {
      const next = await transitionOrgFeedbackAction(prev, formData)
      if (next.status === "success") {
        setNote("")
        router.refresh()
      }
      return next
    },
    { status: "idle" } satisfies TransitionOrgFeedbackState
  )

  const err =
    actionState.status === "error"
      ? actionState.messageKey
      : actionState.status === "validation"
        ? "errorValidation"
        : null

  if (state === "resolved" || state === "rejected") {
    return (
      <span className="text-xs text-muted-foreground">
        {state === "resolved" ? t("terminalResolved") : t("terminalRejected")}
      </span>
    )
  }

  return (
    <div className="flex min-w-[200px] max-w-xs flex-col gap-2">
      {state === "new" ? (
        <form action={formAction} className="flex flex-col gap-1">
          <input type="hidden" name="id" value={id} readOnly />
          <input type="hidden" name="transition" value="acknowledge" readOnly />
          <TransitionSubmitButton
            label={t("acknowledge")}
            pendingLabel={t("pending")}
            variant="secondary"
          />
        </form>
      ) : null}

      {state === "acknowledged" ? (
        <>
          <div className="space-y-1">
            <Label htmlFor={`fb-note-${id}`} className="text-[10px] text-muted-foreground">
              {t("noteOptional")}
            </Label>
            <Textarea
              id={`fb-note-${id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={FEEDBACK_RESOLUTION_NOTE_MAX}
              className="text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <form action={formAction} className="inline">
              <input type="hidden" name="id" value={id} readOnly />
              <input type="hidden" name="transition" value="resolve" readOnly />
              <input type="hidden" name="resolutionNote" value={note} readOnly />
              <TransitionSubmitButton
                label={t("resolve")}
                pendingLabel={t("pending")}
                variant="default"
              />
            </form>
            <form action={formAction} className="inline">
              <input type="hidden" name="id" value={id} readOnly />
              <input type="hidden" name="transition" value="reject" readOnly />
              <input type="hidden" name="resolutionNote" value={note} readOnly />
              <TransitionSubmitButton
                label={t("reject")}
                pendingLabel={t("pending")}
                variant="outline"
              />
            </form>
          </div>
        </>
      ) : null}

      {err ? (
        <p className="text-[10px] text-destructive" role="alert">
          {t(`error.${err}`)}
        </p>
      ) : null}
    </div>
  )
}
