"use client"

import { useActionState, useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Loader2, Send } from "lucide-react"

import { Button } from "#components2/ui/button"
import { Textarea } from "#components2/ui/textarea"
import { cn } from "#lib/utils"

import type { FeedbackCategoryId, FeedbackSeverityId } from "../constants"
import { FEEDBACK_CATEGORIES, FEEDBACK_SEVERITIES } from "../constants"
import { submitOrgFeedbackAction } from "../actions/submit-feedback"
import type { SubmitOrgFeedbackState } from "../types"

const CATEGORY_IDS = [...FEEDBACK_CATEGORIES] as FeedbackCategoryId[]

const SEVERITY_IDS = [...FEEDBACK_SEVERITIES] as FeedbackSeverityId[]

export type OrgFeedbackComposeMetadata = {
  source?: "utility-marketplace"
  requestKind?: "rail-icon"
  utilityId?: string
}

export type OrgFeedbackComposeFormProps = {
  metadata?: OrgFeedbackComposeMetadata
  /** Called when the user dismisses success or parent closes the surface. */
  onReset?: () => void
  className?: string
}

const INITIAL_STATE: SubmitOrgFeedbackState = { status: "idle" }

export function OrgFeedbackComposeForm({
  metadata,
  onReset,
  className,
}: OrgFeedbackComposeFormProps) {
  const t = useTranslations("Dashboard.shell.utilityBar.feedback")
  const pathname = usePathname()
  const [state, formAction, pending] = useActionState(
    submitOrgFeedbackAction,
    INITIAL_STATE
  )
  const [category, setCategory] = useState<FeedbackCategoryId>("idea")
  const [severity, setSeverity] = useState<FeedbackSeverityId>("normal")

  const messageErrorKey =
    state.status === "validation" ? state.fieldErrors.message : undefined

  function handleSendAnother() {
    onReset?.()
  }

  if (state.status === "success") {
    return (
      <div
        className={cn(
          "flex flex-col items-center gap-3 px-4 py-8 text-center",
          className
        )}
      >
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
          <Send className="size-4 text-primary" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium text-foreground">{t("success")}</p>
        <button
          type="button"
          onClick={handleSendAnother}
          className="mt-1 text-[11px] text-primary underline-offset-2 hover:underline"
        >
          {t("sendAnother")}
        </button>
      </div>
    )
  }

  return (
    <form action={formAction} className={cn("space-y-4 px-4 py-4", className)}>
      <input type="hidden" name="path" value={pathname} />
      <input
        type="hidden"
        name="userAgent"
        value={typeof navigator !== "undefined" ? navigator.userAgent : ""}
      />
      <input type="hidden" name="category" value={category} />
      <input
        type="hidden"
        name="severity"
        value={category === "bug" ? severity : "normal"}
      />
      {metadata?.source ? (
        <input type="hidden" name="source" value={metadata.source} />
      ) : null}
      {metadata?.requestKind ? (
        <input type="hidden" name="requestKind" value={metadata.requestKind} />
      ) : null}
      {metadata?.utilityId ? (
        <input type="hidden" name="utilityId" value={metadata.utilityId} />
      ) : null}

      {state.status === "error" ? (
        <p className="text-[11px] text-destructive" role="alert">
          {t("errorGeneric")}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("categoryLabel")}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategory(id)}
              className={cn(
                "rounded-md px-3 py-1 text-[11px] font-medium ring-1 transition-colors",
                category === id
                  ? "bg-primary text-primary-foreground ring-primary"
                  : "bg-transparent text-muted-foreground ring-border/50 hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {t(`category.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {category === "bug" ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
            {t("severityLabel")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SEVERITY_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setSeverity(id)}
                className={cn(
                  "rounded-md px-3 py-1 text-[11px] font-medium ring-1 transition-colors",
                  severity === id
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-transparent text-muted-foreground ring-border/50 hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {t(`severity.${id}`)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
          {t("messageLabel")}
        </p>
        <Textarea
          name="message"
          placeholder={t("messagePlaceholder")}
          rows={4}
          required
          minLength={5}
          aria-invalid={messageErrorKey ? true : undefined}
          className="resize-none text-[11px]"
        />
        {messageErrorKey ? (
          <p className="text-[10px] text-destructive" role="alert">
            {t(messageErrorKey)}
          </p>
        ) : null}
      </div>

      <Button
        type="submit"
        size="sm"
        disabled={pending}
        className="w-full gap-1.5"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
        ) : (
          <Send className="size-3.5" strokeWidth={2} />
        )}
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  )
}
