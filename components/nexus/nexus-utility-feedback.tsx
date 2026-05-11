"use client"

import { useActionState, useSyncExternalStore, useState } from "react"
import { useFormStatus } from "react-dom"
import { MessageSquare } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_MESSAGE_MAX,
  submitOrgFeedbackAction,
  type FeedbackCategoryId,
  type SubmitOrgFeedbackState,
} from "#features/org-feedback/client"
import { usePathname } from "#i18n/navigation"
import { Button } from "#components/ui/button"
import { Label } from "#components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "#components/ui/popover"
import { Textarea } from "#components/ui/textarea"
import { cn } from "#lib/utils"

import { NEXUS_UTILITY_ROUND_CONTROL_CLASS } from "./nexus-utility-round-control-class"
import { NexusUtilityTriggerTooltip } from "./nexus-utility-trigger-tooltip"

function FeedbackSubmitButton({
  label,
  pendingLabel,
}: {
  label: string
  pendingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      disabled={pending}
      variant="default"
      size="sm"
      className="w-full"
    >
      {pending ? pendingLabel : label}
    </Button>
  )
}

function NexusUtilityFeedbackFormInner({
  onSendAnother,
}: {
  onSendAnother: () => void
}) {
  const t = useTranslations("Dashboard.shell.utilityBar.feedback")
  const pathname = usePathname()
  const ua = useSyncExternalStore(
    () => () => {
      /* no store subscription; snapshot is stable per document */
    },
    () => (typeof navigator !== "undefined" ? navigator.userAgent : ""),
    () => ""
  )

  const [state, formAction] = useActionState(submitOrgFeedbackAction, {
    status: "idle",
  } satisfies SubmitOrgFeedbackState)

  const [category, setCategory] = useState<FeedbackCategoryId>("idea")
  const [bugSeverity, setBugSeverity] = useState<"low" | "normal" | "high">(
    "normal"
  )
  const [message, setMessage] = useState("")

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
        <MessageSquare
          className="size-6 text-muted-foreground/60"
          aria-hidden
          strokeWidth={1.5}
        />
        <p className="text-sm text-foreground">{t("success")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSendAnother}
        >
          {t("sendAnother")}
        </Button>
      </div>
    )
  }

  const severityValue = category === "bug" ? bugSeverity : "normal"

  const messageIssueKey =
    state.status === "validation" ? state.fieldErrors.message : undefined

  return (
    <form action={formAction} className="flex flex-col gap-3 p-4">
      <input type="hidden" name="path" value={pathname} readOnly />
      <input type="hidden" name="userAgent" value={ua} readOnly />
      <input type="hidden" name="category" value={category} readOnly />
      <input type="hidden" name="severity" value={severityValue} readOnly />

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          {t("categoryLabel")}
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {FEEDBACK_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                category === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
              )}
            >
              {t(`category.${c}`)}
            </button>
          ))}
        </div>
        {state.status === "validation" && state.fieldErrors.category ? (
          <p className="text-xs text-destructive" role="alert">
            {t("errorCategory")}
          </p>
        ) : null}
      </div>

      {category === "bug" ? (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            {t("severityLabel")}
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {(["low", "normal", "high"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setBugSeverity(s)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                  bugSeverity === s
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                {t(`severity.${s}`)}
              </button>
            ))}
          </div>
          {state.status === "validation" && state.fieldErrors.severity ? (
            <p className="text-xs text-destructive" role="alert">
              {t("errorSeverity")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <Label
          htmlFor="org-feedback-message"
          className="text-xs text-muted-foreground"
        >
          {t("messageLabel")}
        </Label>
        <Textarea
          id="org-feedback-message"
          name="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          maxLength={FEEDBACK_MESSAGE_MAX}
          required
          placeholder={t("messagePlaceholder")}
          aria-invalid={Boolean(messageIssueKey)}
        />
        <div className="flex justify-end text-[10px] text-muted-foreground">
          <span>
            {t("messageCounter", {
              count: message.length,
              max: FEEDBACK_MESSAGE_MAX,
            })}
          </span>
        </div>
        {messageIssueKey ? (
          <p className="text-xs text-destructive" role="alert">
            {t(messageIssueKey)}
          </p>
        ) : null}
      </div>

      {state.status === "error" ? (
        <p className="text-xs text-destructive" role="alert">
          {t(state.messageKey)}
        </p>
      ) : null}

      <FeedbackSubmitButton
        label={t("submit")}
        pendingLabel={t("submitting")}
      />
    </form>
  )
}

/**
 * Submit operator feedback to durable org storage + IAM audit (`org.feedback.submit`).
 */
export function NexusUtilityFeedback() {
  const t = useTranslations("Dashboard.shell.utilityBar.feedback")
  const [formInstance, setFormInstance] = useState(0)

  return (
    <Popover>
      <NexusUtilityTriggerTooltip tooltip={t("tooltip")} align="end">
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("trigger")}
            className={cn(NEXUS_UTILITY_ROUND_CONTROL_CLASS)}
          >
            <MessageSquare
              className="size-[15px] shrink-0"
              aria-hidden
              strokeWidth={2}
            />
          </button>
        </PopoverTrigger>
      </NexusUtilityTriggerTooltip>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        className="af-nexus-popover-panel w-80 bg-background/92 p-0"
      >
        <div className="border-b border-border/50 px-4 py-3">
          <p className="text-xs font-medium text-foreground">{t("title")}</p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t("description")}
          </p>
        </div>
        <NexusUtilityFeedbackFormInner
          key={formInstance}
          onSendAnother={() => setFormInstance((k) => k + 1)}
        />
      </PopoverContent>
    </Popover>
  )
}
